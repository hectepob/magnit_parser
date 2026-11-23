
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
   * Создаёт задачу поиска на GitHub.
   */
  startGoodsSearch(term, stores) {
    const requestId = crypto.randomUUID();

    const payload = {
      requestId,
      brand: term,
      stores: stores.map(store => ({
        storeCode: String(store.storeCode)
      }))
    };

    const body = [
      "Автоматический поиск товаров Магнит.",
      "",
      `Бренд: ${term}`,
      `Количество магазинов: ${stores.length}`,
      "",
      "<!-- MAGNIT_SEARCH_REQUEST",
      JSON.stringify(payload),
      "-->"
    ].join("\n");

    const issueUrl = new URL(
      "https://github.com/hectepob/magnit_parser/issues/new"
    );

    issueUrl.searchParams.set(
      "title",
      `[MAGNIT-SEARCH] ${requestId}`
    );

    issueUrl.searchParams.set("body", body);

    const issueWindow = window.open(
      issueUrl.toString(),
      "_blank"
    );

    if (!issueWindow) {
      throw new Error(
        "Браузер заблокировал новую вкладку. " +
        "Разрешите всплывающие окна для сайта и повторите поиск."
      );
    }

    issueWindow.opener = null;

    return {
      requestId
    };
  },

  /**
   * Ожидает появления результатов с нужным requestId.
   */
  async waitForGoodsResults(requestId, onStatus) {
const maxAttempts = 240;
const interval = 5000;

    const delay = ms =>
      new Promise(resolve => setTimeout(resolve, ms));

    const url = new URL(
      "results.json",
      window.location.href
    );

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        url.searchParams.set("_", Date.now());

        const response = await fetch(url, {
          method: "GET",
          cache: "no-store"
        });

        if (response.ok) {
          const data = await response.json();

          if (
            data &&
            data.requestId === requestId &&
            Array.isArray(data.stores)
          ) {
            return data;
          }
        }
      } catch (error) {
        console.warn(
          "Ожидание результатов поиска:",
          error
        );
      }

      if (attempt % 5 === 0 && onStatus) {
        onStatus(
          "Ожидаем завершения поиска на GitHub Actions..."
        );
      }

      await delay(interval);
    }

    throw new Error(
      "Не удалось дождаться результатов за 10 минут. " +
      "Проверьте выполнение workflow в GitHub Actions."
    );
  }
};
