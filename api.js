
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
        "Не удалось загрузить список магазинов. " +
        (error.message || error.name || "Ошибка сети.")
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
    const url = "https://magnit.ru/webgate/v2/goods/search";

    const requestBody = {
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
    };

    let response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(requestBody)
      });
    } catch (error) {
      const online = navigator.onLine;

      const details = [
        `Тип ошибки: ${error.name || "неизвестен"}`,
        `Сообщение браузера: ${error.message || "не предоставлено"}`,
        `Интернет: ${online ? "подключение определяется как активное" : "браузер сообщает об отсутствии подключения"}`,
        `Магазин: ${storeCode}`,
        `Адрес запроса: ${url}`,
        "Возможные причины: CORS, сетевая ошибка или блокировка запроса."
      ];

      console.error("Ошибка запроса к API Магнита:", error);

      throw new Error(details.join(" | "));
    }

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText}. ` +
        `Магазин: ${storeCode}.`
      );
    }

    let data;

    try {
      data = await response.json();
    } catch (error) {
      throw new Error(
        `API Магнита вернул некорректный JSON. Магазин: ${storeCode}.`
      );
    }

    if (!data || !Array.isArray(data.items)) {
      throw new Error(
        `В ответе API отсутствует список товаров. Магазин: ${storeCode}.`
      );
    }

    return data.items;
  }
};
