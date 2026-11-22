
"use strict";

window.MagnitApi = {
  /**
   * Загружает список магазинов из stores.json.
   */
  async loadStores() {
    const url = new URL("stores.json", window.location.href);

    let response;

    try {
      response = await fetch(url, {
        method: "GET",
        cache: "no-cache"
      });
    } catch (error) {
      throw new Error(
        "Не удалось загрузить список магазинов. Проверьте подключение к интернету."
      );
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          "Файл stores.json не найден. Проверьте публикацию данных."
        );
      }

      throw new Error(
        `Ошибка загрузки магазинов: HTTP ${response.status}.`
      );
    }

    let data;

    try {
      data = await response.json();
    } catch (error) {
      throw new Error(
        "Файл stores.json содержит некорректные данные."
      );
    }

    if (!data || !Array.isArray(data.stores) || data.stores.length === 0) {
      throw new Error(
        "В файле stores.json нет списка магазинов."
      );
    }

    const stores = data.stores.filter(store => {
      return (
        store &&
        store.storeCode &&
        store.address &&
        Number.isFinite(Number(store.latitude)) &&
        Number.isFinite(Number(store.longitude))
      );
    }).map(store => ({
      ...store,
      storeCode: String(store.storeCode),
      latitude: Number(store.latitude),
      longitude: Number(store.longitude)
    }));

    if (stores.length === 0) {
      throw new Error(
        "В файле нет магазинов с корректными координатами."
      );
    }

    return {
      city: data.city || "",
      updatedAt: data.updatedAt || "",
      stores
    };
  },

  /**
   * Ищет товары по названию бренда в конкретном магазине.
   */
  async searchGoods(term, storeCode) {
    let response;

    try {
      response = await fetch(
        "https://magnit.ru/webgate/v2/goods/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            term: term,
            pagination: {
              limit: 50,
              offset: 0
            },
            sort: {
              order: "desc",
              type: "popularity"
            },
            includeAdultGoods: true,
            storeCode: String(storeCode),
            storeType: "1",
            catalogType: "1"
          })
        }
      );
    } catch (error) {
      throw new Error(
        "Ошибка сетевого запроса. Возможно, браузер заблокировал обращение к API Магнита (CORS)."
      );
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    let data;

    try {
      data = await response.json();
    } catch (error) {
      throw new Error("API Магнита вернул некорректный JSON.");
    }

    if (!data || !Array.isArray(data.items)) {
      throw new Error(
        "В ответе API отсутствует список товаров."
      );
    }

    return data.items;
  }
};
