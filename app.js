
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const cityInput = document.getElementById("city");
  const centerInput = document.getElementById("center");
  const radiusInput = document.getElementById("radius");

  const formatInputs = document.querySelectorAll(
    'input[name="format"]'
  );

  const searchButton = document.getElementById("searchButton");
  const statusElement = document.getElementById("status");
  const resultsElement = document.getElementById("results");
  const resultsCountElement = document.getElementById("resultsCount");

  function pluralStores(count) {
    const lastTwo = count % 100;
    const last = count % 10;

    if (lastTwo >= 11 && lastTwo <= 14) {
      return "магазинов";
    }

    if (last === 1) {
      return "магазин";
    }

    if (last >= 2 && last <= 4) {
      return "магазина";
    }

    return "магазинов";
  }

  function setStatus(message) {
    statusElement.textContent = message;
  }

  function clearResults() {
    resultsElement.replaceChildren();
    resultsCountElement.textContent = "0 магазинов";
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

    resultsCountElement.textContent =
      `${stores.length} ${pluralStores(stores.length)}`;

    const fragment = document.createDocumentFragment();

    stores.forEach(store => {
      const item = document.createElement("article");
      item.className = "store-item";

      item.appendChild(
        createTextElement("store-address", store.address)
      );

      const details = [
        `Расстояние: ${store.distance.toFixed(2)} км`,
        `Код: ${store.storeCode}`
      ];

      if (store.format) {
        details.push(`Формат: ${store.format}`);
      }

      item.appendChild(
        createTextElement(
          "store-details",
          details.join(" · ")
        )
      );

      fragment.appendChild(item);
    });

    resultsElement.appendChild(fragment);
  }

  async function searchStores() {
    clearResults();

    let center;
    let radius;

    const selectedFormats = Array.from(formatInputs)
      .filter(input => input.checked)
      .map(input => input.value);

    if (selectedFormats.length === 0) {
      setStatus("Выберите хотя бы один формат магазина.");
      return;
    }

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

      const foundStores = data.stores
        .filter(store => selectedFormats.includes(store.format))
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
        `${data.stores.filter(store =>
          selectedFormats.includes(store.format)
        ).length}. ` +
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

  searchButton.addEventListener("click", searchStores);

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
});
