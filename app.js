
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const cityInput = document.getElementById("city");
  const storeSearchInput = document.getElementById("storeSearch");
  const storeSelect = document.getElementById("storeSelect");
  const centerInput = document.getElementById("center");
  const radiusInput = document.getElementById("radius");
  const brandInput = document.getElementById("brand");
  const excludeWordsInput = document.getElementById("excludeWords");

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
  let storesData = null;
  let storesLoadPromise = null;

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

function populateStoreSelect(stores, searchText = "") {
  const previousValue = storeSelect.value;
  const search = searchText.trim().toLocaleLowerCase("ru");

  const filteredStores = stores.filter(store =>
    store.address.toLocaleLowerCase("ru").includes(search)
  );

  storeSelect.replaceChildren();

  const emptyOption = document.createElement("option");
  emptyOption.value = "";

  if (search && filteredStores.length === 0) {
    emptyOption.textContent = "Совпадений нет";
  } else {
    emptyOption.textContent = "Не выбран";
  }

  storeSelect.appendChild(emptyOption);

  filteredStores.forEach(store => {
    const option = document.createElement("option");

    option.value = store.storeCode;
    option.textContent =
      `${store.address} · ${store.storeCode}`;

    storeSelect.appendChild(option);
  });

  const previousStoreStillVisible = filteredStores.some(
    store => store.storeCode === previousValue
  );

  if (previousStoreStillVisible) {
    storeSelect.value = previousValue;
  } else {
    storeSelect.value = "";
  }
}

  async function loadStoresData() {
    if (!storesLoadPromise) {
      storesLoadPromise = MagnitApi.loadStores()
        .then(data => {
          storesData = data;

          cityInput.value = data.city;
          populateStoreSelect(data.stores);

          return data;
        })
        .catch(error => {
          storesLoadPromise = null;
          throw error;
        });
    }

    return storesLoadPromise;
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
      const data = await loadStoresData();

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


function renderGoodsResults(
  results,
  excludedWords = [],
  requiredWords = []
) {
  goodsResultsElement.replaceChildren();

  const products = new Map();
  const errors = [];

  results.forEach(result => {
    if (result.error) {
      errors.push({
        store: result.store,
        error: result.error
      });

      return;
    }

    const filteredItems = result.items.filter(product => {
      const productName = String(
        product.name || ""
      ).toLocaleLowerCase("ru");

      const containsAllRequiredWords = requiredWords.every(word =>
        productName.includes(word)
      );

      const containsExcludedWords = excludedWords.some(word =>
        productName.includes(word)
      );

      return containsAllRequiredWords && !containsExcludedWords;
    });

    filteredItems.forEach(product => {
      const productCode = product.productId || product.id;

      const productKey = productCode
        ? `id:${productCode}`
        : `name:${String(product.name || "").toLocaleLowerCase("ru")}`;

      if (!products.has(productKey)) {
        products.set(productKey, {
          name: product.name || "Название не указано",
          code: productCode || null,
          stores: []
        });
      }

      products.get(productKey).stores.push({
        store: result.store,
        product
      });
    });
  });

  const fragment = document.createDocumentFragment();

  products.forEach(product => {
    const productBlock = document.createElement("article");
    productBlock.className = "product-group";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "product-checkbox";

    const productContent = document.createElement("div");
    productContent.className = "product-content";

    productContent.appendChild(
      createTextElement(
        "product-name",
        product.name
      )
    );

    if (product.code) {
      productContent.appendChild(
        createTextElement(
          "store-details",
          `Код товара: ${product.code}`
        )
      );
    }

    const label = document.createElement("label");
    label.className = "product-select";

    label.appendChild(checkbox);
    label.appendChild(productContent);

    productBlock.appendChild(label);

    const storesBlock = document.createElement("div");
    storesBlock.className = "product-stores";
    storesBlock.hidden = true;

    product.stores.forEach(item => {
      const storeBlock = document.createElement("div");
      storeBlock.className = "product-store";

      storeBlock.appendChild(
        createTextElement(
          "store-address",
          `${item.store.address} · ${item.store.storeCode}`
        )
      );

      const details = [];
      const foundProduct = item.product;

      if (foundProduct.quantity !== undefined) {
        details.push(`Остаток: ${foundProduct.quantity}`);

        details.push(
          Number(foundProduct.quantity) > 0
            ? "В наличии"
            : "Нет в наличии"
        );
      }

      if (
        foundProduct.price !== undefined &&
        foundProduct.price !== null &&
        Number.isFinite(Number(foundProduct.price))
      ) {
        const price = Number(foundProduct.price) / 100;

        details.push(
          `Цена: ${price.toLocaleString("ru-RU", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} ₽`
        );
      }

      if (details.length > 0) {
        storeBlock.appendChild(
          createTextElement(
            "store-details",
            details.join(" · ")
          )
        );
      }

      storesBlock.appendChild(storeBlock);
    });

    checkbox.addEventListener("change", () => {
      storesBlock.hidden = !checkbox.checked;
    });

    productBlock.appendChild(storesBlock);
    fragment.appendChild(productBlock);
  });

  if (products.size === 0 && errors.length === 0) {
    fragment.appendChild(
      createTextElement(
        "empty-state",
        "Подходящих товаров не найдено."
      )
    );
  }

  if (errors.length > 0) {
    const errorsBlock = document.createElement("div");
    errorsBlock.className = "goods-errors";

    errorsBlock.appendChild(
      createTextElement(
        "goods-error-heading",
        "Ошибки при поиске в магазинах:"
      )
    );

    errors.forEach(item => {
      errorsBlock.appendChild(
        createTextElement(
          "goods-error",
          `${item.store.address} · ${item.store.storeCode}: ${item.error}`
        )
      );
    });

    fragment.appendChild(errorsBlock);
  }

  goodsResultsElement.appendChild(fragment);

  const totalGoods = products.size;

  goodsCountElement.textContent =
    `${totalGoods} ${plural(totalGoods, [
      "товар",
      "товара",
      "товаров"
    ])}`;

  return totalGoods;
}


  async function searchBrand() {
    const rawTerm = brandInput.value.trim();

const isStrictSearch =
  rawTerm.length >= 2 &&
  rawTerm.startsWith('"') &&
  rawTerm.endsWith('"');

const term = isStrictSearch
  ? rawTerm.slice(1, -1).trim()
  : rawTerm;

const requiredWords = isStrictSearch
  ? term.toLocaleLowerCase("ru").split(/\s+/).filter(Boolean)
  : [];
    
    const excludedWords = excludeWordsInput.value
  .split(/[,;\n]+/)
  .map(word => word.trim().toLocaleLowerCase("ru"))
  .filter(word => word.length > 0);

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

const totalGoods = renderGoodsResults(
  normalizedResults,
  excludedWords,
  requiredWords
);

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

  storeSearchInput.addEventListener("input", () => {
  if (storesData) {
    populateStoreSelect(
      storesData.stores,
      storeSearchInput.value
    );
  }
});
  
  storeSelect.addEventListener("change", () => {
    if (!storeSelect.value || !storesData) {
      return;
    }

    const selectedStore = storesData.stores.find(
      store => store.storeCode === storeSelect.value
    );

    if (!selectedStore) {
      return;
    }

    centerInput.value =
      `${selectedStore.latitude}, ${selectedStore.longitude}`;
  });

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

  loadStoresData()
    .then(data => {
      setStatus(
        `Загружен список магазинов: ${data.stores.length}.`
      );
    })
    .catch(error => {
      setStatus(
        error.message || "Не удалось загрузить список магазинов."
      );
    });
});
