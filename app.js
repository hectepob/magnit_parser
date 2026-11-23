
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const cityInput = document.getElementById("city");
  const centerInput = document.getElementById("center");
  const radiusInput = document.getElementById("radius");
  const brandInput = document.getElementById("brand");

  const formatInputs = document.querySelectorAll(
    'input[name="format"]'
  );

  const searchButton = document.getElementById("searchButton");
  const goodsSearchButton = document.getElementById("goodsSearchButton");

  const statusElement = document.getElementById("status");
  const goodsStatusElement = document.getElementById("goodsStatus");

  const resultsElement = document.getElementById("results");
  const resultsCountElement = document.getElementById("resultsCount");

  const goodsResultsElement = document.getElementById("goodsResults");
  const goodsCountElement = document.getElementById("goodsCount");

  let currentFoundStores = [];

  function plural(count, forms) {
    const n = count % 100;
    const last = count % 10;

    if (n >= 11 && n <= 14) return forms[2];
    if (last === 1) return forms[0];
    if (last >= 2 && last <= 4) return forms[1];

    return forms[2];
  }

  function setStatus(message) {
    statusElement.textContent = message;
  }

  function clearResults() {
    resultsElement.replaceChildren();
    resultsCountElement.textContent = "0 магазинов";
    currentFoundStores = [];
  }

  function createTextElement(className, text) {
    const element = document.createElement("div");

    element.className = className;
    element.textContent = text;

    return element;
  }

  function renderResults(stores) {
    clearResults();

    if (stores.length === 0) {
      resultsElement.appendChild(
        createTextElement(
          "empty-state",
          "В указанном радиусе магазины не найдены."
        )
      );

      return;
    }

    currentFoundStores = stores;

    resultsCountElement.textContent =
      `${stores.length} ${plural(stores.length, [
        "магазин",
        "магазина",
        "магазинов"
      ])}`;

    const fragment = document.createDocumentFragment();

    stores.forEach(store => {
      const item = document.createElement("article");
      item.className = "store-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "store-checkbox";
      checkbox.checked = true;
      checkbox.value = store.storeCode;
      checkbox.dataset.storeCode = store.storeCode;

      const content = document.createElement("div");
      content.className = "store-content";

      content.appendChild(
        createTextElement("store-address", store.address)
      );

      const details = [
        `Расстояние: ${store.distance.toFixed(2)} км`,
        `Код: ${store.storeCode}`
      ];

      if (store.format) {
        details.push(`Формат: ${store.format}`);
      }

      content.appendChild(
        createTextElement(
          "store-details",
          details.join(" · ")
        )
      );

      const label = document.createElement("label");
      label.className = "store-select";

      label.appendChild(checkbox);
      label.appendChild(content);

      item.appendChild(label);
      fragment.appendChild(item);
    });

    resultsElement.appendChild(fragment);
  }

  async function searchStores() {
    clearResults();

    goodsResultsElement.replaceChildren();
    goodsCountElement.textContent = "0 товаров";
    goodsStatusElement.textContent = "";

    const selectedFormats = Array.from(formatInputs)
      .filter(input => input.checked)
      .map(input => input.value);

    if (selectedFormats.length === 0) {
      setStatus("Выберите хотя бы один формат магазина.");
      return;
    }

    let center;
    let radius;

    try {
      center = MagnitGeo.parseCoordinates(centerInput.value);

      radius = Number(radiusInput.value);

      if (
        !Number.isFinite(radius) ||
        radius < 0.1 ||
        radius > 100
      ) {
        throw new Error(
          "Радиус должен быть от 0,1 до 100 км."
        );
      }
    } catch (error) {
      setStatus(error.message);
      return;
    }

    searchButton.disabled = true;
    setStatus("Загружаем список магазинов...");

    try {
      const data = await MagnitApi.loadStores();

      const requestedCity = cityInput.value.trim().toLocaleLowerCase("ru");
      const loadedCity = data.city.trim().toLocaleLowerCase("ru");

      if (requestedCity && loadedCity && requestedCity !== loadedCity) {
        throw new Error(
          `В файле загружены магазины города «${data.city}», а не «${cityInput.value.trim()}».`
        );
      }

      const storesOfSelectedFormats = data.stores.filter(store =>
        selectedFormats.includes(store.format)
      );

      const foundStores = storesOfSelectedFormats
        .map(store => {
          const distance = MagnitGeo.distanceKm(
            center.latitude,
            center.longitude,
            store.latitude,
            store.longitude
          );

          return {
            ...store,
            distance
          };
        })
        .filter(store => store.distance <= radius)
        .sort((a, b) => a.distance - b.distance);

      renderResults(foundStores);

      const updateInfo = data.updatedAt
        ? ` Данные обновлены: ${data.updatedAt}.`
        : "";

      setStatus(
        `Проверено магазинов выбранных форматов: ` +
        `${storesOfSelectedFormats.length}. ` +
        `В радиусе ${radius} км найдено: ${foundStores.length}.` +
        updateInfo
      );

    } catch (error) {
      clearResults();
      setStatus(error.message || "Не удалось выполнить поиск.");
    } finally {
      searchButton.disabled = false;
    }
  }

  function renderGoodsResults(results) {
    goodsResultsElement.replaceChildren();

    let totalGoods = 0;

    const fragment = document.createDocumentFragment();

    results.forEach(result => {
      const storeBlock = document.createElement("article");
      storeBlock.className = "goods-store";

      const heading = document.createElement("h3");
      heading.textContent =
        `${result.store.address} · ${result.store.storeCode}`;

      storeBlock.appendChild(heading);

      if (result.error) {
        storeBlock.appendChild(
          createTextElement(
            "goods-error",
            `Ошибка запроса: ${result.error}`
          )
        );

        fragment.appendChild(storeBlock);
        return;
      }

      if (result.items.length === 0) {
        storeBlock.appendChild(
          createTextElement(
            "empty-state",
            "Товары по запросу не найдены."
          )
        );

        fragment.appendChild(storeBlock);
        return;
      }

      totalGoods += result.items.length;

      result.items.forEach(product => {
        const productBlock = document.createElement("div");
        productBlock.className = "product-item";

        productBlock.appendChild(
          createTextElement(
            "product-name",
            product.name || "Название не указано"
          )
        );

        const details = [];

        if (product.productId || product.id) {
          details.push(
            `Код товара: ${product.productId || product.id}`
          );
        }

        if (product.quantity !== undefined) {
          details.push(`Остаток: ${product.quantity}`);

          details.push(
            Number(product.quantity) > 0
              ? "В наличии"
              : "Нет в наличии"
          );
        }

if (
  product.price !== undefined &&
  product.price !== null &&
  Number.isFinite(Number(product.price))
) {
  const price = Number(product.price) / 100;

  details.push(
    `Цена: ${price.toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} ₽`
  );
}

        productBlock.appendChild(
          createTextElement(
            "store-details",
            details.join(" · ")
          )
        );

        storeBlock.appendChild(productBlock);
      });

      fragment.appendChild(storeBlock);
    });

    goodsResultsElement.appendChild(fragment);

    goodsCountElement.textContent =
      `${totalGoods} ${plural(totalGoods, [
        "товар",
        "товара",
        "товаров"
      ])}`;

    return totalGoods;
  }

  async function searchBrand() {
    const term = brandInput.value.trim();

    if (!term) {
      goodsStatusElement.textContent =
        "Введите название бренда.";

      return;
    }

    const selectedCodes = new Set(
      Array.from(
        resultsElement.querySelectorAll(".store-checkbox:checked")
      ).map(input => input.dataset.storeCode)
    );

    const selectedStores = currentFoundStores.filter(store =>
      selectedCodes.has(store.storeCode)
    );

    if (selectedStores.length === 0) {
      goodsStatusElement.textContent =
        "Нет отмеченных магазинов для поиска.";

      return;
    }

    goodsSearchButton.disabled = true;
    searchButton.disabled = true;

    goodsResultsElement.replaceChildren();
    goodsCountElement.textContent = "Поиск...";

    try {
      goodsStatusElement.textContent =
        "Открываем GitHub для подтверждения поиска...";

      const searchRequest = MagnitApi.startGoodsSearch(
        term,
        selectedStores
      );

      goodsStatusElement.textContent =
        "В новой вкладке подтверди создание задачи на GitHub. " +
        "После этого результаты появятся здесь автоматически.";

      const data = await MagnitApi.waitForGoodsResults(
        searchRequest.requestId,
        message => {
          goodsStatusElement.textContent = message;
        }
      );

      const normalizedResults = data.stores.map(result => ({
        store: result.store,
        items: Array.isArray(result.items) ? result.items : [],
        error: result.error || null
      }));

      const totalGoods = renderGoodsResults(normalizedResults);

      const errorsCount = normalizedResults.filter(
        result => result.error
      ).length;

      const successfulCount =
        normalizedResults.length - errorsCount;

      goodsStatusElement.textContent =
        `Поиск «${data.brand}» завершён. ` +
        `Обработано магазинов: ${successfulCount} из ${normalizedResults.length}. ` +
        `Найдено товаров: ${totalGoods}. ` +
        `Ошибок: ${errorsCount}.`;

    } catch (error) {
      goodsStatusElement.textContent =
        error.message || "Не удалось выполнить поиск.";
    } finally {
      goodsSearchButton.disabled = false;
      searchButton.disabled = false;
    }
  }

  searchButton.addEventListener("click", searchStores);
  goodsSearchButton.addEventListener("click", searchBrand);

  centerInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      searchStores();
    }
  });

  radiusInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      searchStores();
    }
  });

  brandInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      searchBrand();
    }
  });
});
