
"use strict";

window.MagnitGeo = {
  /**
   * Разбирает координаты в формате:
   * широта, долгота
   *
   * Пример: 43.5855, 39.7231
   */
  parseCoordinates(value) {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error("Укажите координаты центра поиска.");
    }

    const parts = value.trim().split(",");

    if (parts.length !== 2) {
      throw new Error(
        "Введите координаты в формате: широта, долгота."
      );
    }

    const latitude = Number(parts[0].trim());
    const longitude = Number(parts[1].trim());

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("Координаты должны содержать числа.");
    }

    if (latitude < -90 || latitude > 90) {
      throw new Error("Широта должна быть от -90 до 90.");
    }

    if (longitude < -180 || longitude > 180) {
      throw new Error("Долгота должна быть от -180 до 180.");
    }

    return {
      latitude,
      longitude
    };
  },

  /**
   * Рассчитывает расстояние между двумя точками
   * по формуле гаверсинусов.
   *
   * Координаты передаются в градусах.
   * Результат — километры.
   */
  distanceKm(lat1, lon1, lat2, lon2) {
    const earthRadius = 6371.0088;

    const toRadians = degrees => degrees * Math.PI / 180;

    const latitude1 = toRadians(lat1);
    const latitude2 = toRadians(lat2);

    const deltaLatitude = toRadians(lat2 - lat1);
    const deltaLongitude = toRadians(lon2 - lon1);

    const a =
      Math.sin(deltaLatitude / 2) ** 2 +
      Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(deltaLongitude / 2) ** 2;

    const safeA = Math.min(1, Math.max(0, a));

    const centralAngle =
      2 * Math.atan2(
        Math.sqrt(safeA),
        Math.sqrt(1 - safeA)
      );

    return earthRadius * centralAngle;
  }
};
