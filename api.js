
"use strict";

window.MagnitApi = {
  /**
   * Загружает подготовленный список магазинов
   * из stores.json.
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
        "Не удалось подключиться к файлу stores.json."
      );
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          "Файл stores.json пока не создан. Сначала нужно загрузить список магазинов."
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
        "Файл stores.json содержит некорректный JSON."
      );
    }

    if (!data || !Array.isArray(data.stores)) {
      throw new Error(
        "В stores.json отсутствует массив stores."
      );
    }

    if (data.stores.length === 0) {
      throw new Error(
        "В stores.json нет магазинов."
      );
    }

    const stores = data.stores.map((store, index) => {
      if (!store || typeof store !== "object") {
        throw new Error(
          `Некорректная запись магазина №${index + 1}.`
        );
      }

      const latitude = Number(store.latitude);
      const longitude = Number(store.longitude);

      if (
        store.storeCode === undefined ||
        store.storeCode === null ||
        !String(store.storeCode).trim()
      ) {
        throw new Error(
          `У магазина №${index + 1} отсутствует код.`
        );
      }

      if (
        typeof store.address !== "string" ||
        !store.address.trim()
      ) {
        throw new Error(
          `У магазина №${index + 1} отсутствует адрес.`
        );
      }

      if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        throw new Error(
          `У магазина №${index + 1} некорректные координаты.`
        );
      }

      return {
        storeCode: String(store.storeCode),
        address: store.address,
        latitude,
        longitude,
        format: store.format || ""
      };
    });

    return {
      city: data.city || "",
      updatedAt: data.updatedAt || "",
      stores
    };
  }
};
