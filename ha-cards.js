/**
 * HA-CARDS - verzameling Home Assistant dashboardkaarten.
 */

const HA_CARDS_VERSION = "1.0.4";

console.info(
  `%c HA-CARDS %c v${HA_CARDS_VERSION} `,
  "color: #ffffff; background: #14342b; font-weight: 700;",
  "color: #101112; background: #d8d8d8; font-weight: 700;"
);

const DEFAULTS = {
  title: "Status",
  background_color: "#101112",
  accent_color: "#d8d8d8",
  text_color: "#ffffff",
  muted_text_color: "#a7a7a7",
  tile_color: "#1a1b1d",
  border_color: "#2a2b2e",
  entity: undefined,
  motion_entity: undefined,
  last_opened_entity: undefined,
  secondary_entity: undefined,
  icon: "mdi:home-assistant",
  decimals: 0,
  threshold: 25,
  show_current_lux: true,
  show_lux_change: true,
  show_threshold: true,
  show_sensor_state: true,
};

const MAILBOX_EDITOR_LABELS = {
  title: "Titel",
  entity: "Luxsensor",
  motion_entity: "Bewegingssensor entiteit",
  last_opened_entity: "Laatst geleegd entiteit",
  threshold: "Lux drempel",
  show_current_lux: "Toon huidige lux",
  show_lux_change: "Toon lux verschil",
  show_threshold: "Toon drempel",
  show_sensor_state: "Toon sensorstatus",
};

const WASTE_EDITOR_LABELS = {
  title: "Titel",
  gft_entity: "GFT entiteit",
  paper_entity: "Papier / Karton entiteit",
  pmd_entity: "PMD/Rest entiteit",
  rest_entity: "Rest entiteit",
  show_today: "Toon vandaag",
  show_tomorrow: "Toon morgen",
  show_waste_types: "Toon afvalsoorten",
};

const TRANSLATIONS = {
  en: {
    unavailable: "Unavailable",
    unknown: "Unknown",
    empty: "Add an entity in the card editor.",
    mailboxNever: "No opening detected yet",
    mailboxLastOpened: "Mail received",
    mailboxLastEmptied: "Last emptied",
    mailboxNoMotion: "No motion detected yet",
    mailboxLuxChange: "Lux change",
    mailboxCurrentLux: "Current lux",
    mailboxThreshold: "Threshold",
    wasteToday: "Today",
    wasteTomorrow: "Tomorrow",
    wasteNoneToday: "No pickup today",
    wasteNoneTomorrow: "No pickup tomorrow",
    crawlspaceTemperature: "Temperature",
    crawlspaceHumidity: "Humidity",
    crawlspaceMoldRisk: "Mold risk",
    crawlspaceRiskLow: "Low",
    crawlspaceRiskElevated: "Elevated",
    crawlspaceRiskHigh: "High",
    crawlspaceRiskVeryHigh: "Very high",
    crawlspaceRiskNote: "Indicative estimate from temperature and relative humidity",
  },
  nl: {
    unavailable: "Niet beschikbaar",
    unknown: "Onbekend",
    empty: "Voeg een entiteit toe in de kaart-editor.",
    mailboxNever: "Nog geen opening gemeten",
    mailboxLastOpened: "Post ontvangen",
    mailboxLastEmptied: "Laatst geleegd",
    mailboxNoMotion: "Nog geen beweging gemeten",
    mailboxLuxChange: "Lux verschil",
    mailboxCurrentLux: "Huidige lux",
    mailboxThreshold: "Drempel",
    wasteToday: "Vandaag",
    wasteTomorrow: "Morgen",
    wasteNoneToday: "Geen ophaal vandaag",
    wasteNoneTomorrow: "Geen ophaal morgen",
    crawlspaceTemperature: "Temperatuur",
    crawlspaceHumidity: "Luchtvochtigheid",
    crawlspaceMoldRisk: "Schimmelrisico",
    crawlspaceRiskLow: "Laag",
    crawlspaceRiskElevated: "Verhoogd",
    crawlspaceRiskHigh: "Hoog",
    crawlspaceRiskVeryHigh: "Zeer hoog",
    crawlspaceRiskNote: "Indicatie op basis van temperatuur en relatieve luchtvochtigheid",
  },
};

function toCssColor(value, fallback) {
  if (!value) return fallback;
  if (Array.isArray(value) && value.length >= 3) return `rgb(${value[0]}, ${value[1]}, ${value[2]})`;
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

class HaCardsBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = undefined;
  }

  setConfig(config) {
    this._config = { ...DEFAULTS, ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 3;
  }

  _t(key) {
    const language = (this._hass?.locale?.language || this._hass?.language || "en").slice(0, 2);
    return (TRANSLATIONS[language] || TRANSLATIONS.en)[key] ?? TRANSLATIONS.en[key];
  }

  _state(entityId) {
    return entityId && this._hass ? this._hass.states[entityId] : undefined;
  }

  _formatValue(entityId, decimals = 0) {
    const stateObj = this._state(entityId);
    if (!stateObj) return "--";
    if (["unavailable", "unknown"].includes(stateObj.state)) return this._t(stateObj.state);

    const numeric = Number(stateObj.state);
    const unit = stateObj.attributes.unit_of_measurement;
    if (Number.isFinite(numeric)) {
      const language = this._hass?.locale?.language || this._hass?.language || "nl";
      return `${numeric.toLocaleString(language, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${unit ? ` ${unit}` : ""}`;
    }

    if (this._hass?.formatEntityState) {
      try {
        return this._hass.formatEntityState(stateObj);
      } catch (err) {
        return stateObj.state;
      }
    }

    return stateObj.state;
  }

  _friendlyName(entityId) {
    const stateObj = this._state(entityId);
    return stateObj?.attributes?.friendly_name || entityId || "";
  }

  _formatDateTime(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";

    const language = this._hass?.locale?.language || this._hass?.language || "nl";
    return new Intl.DateTimeFormat(language, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  _dateFromEntity(entityId, useStateChangeFallback = false) {
    const stateObj = this._state(entityId);
    if (!stateObj || ["unavailable", "unknown"].includes(stateObj.state)) return undefined;

    const timestamp = Number(stateObj.attributes?.timestamp);
    if (Number.isFinite(timestamp)) return new Date(timestamp * 1000);

    const parsed = new Date(String(stateObj.state).replace(" ", "T"));
    if (!Number.isNaN(parsed.getTime())) return parsed;

    if (useStateChangeFallback) {
      const changed = new Date(stateObj.last_changed || stateObj.last_updated || "");
      if (!Number.isNaN(changed.getTime())) return changed;
    }

    return undefined;
  }

  _formatMailboxDateTime(value) {
    if (!value) return "--";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "--";

    const language = this._hass?.locale?.language || this._hass?.language || "nl";
    const today = new Date();
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
    const time = new Intl.DateTimeFormat(language, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

    if (isToday) return `${language.startsWith("nl") ? "Vandaag" : "Today"} ${time}`;

    const dateParts = { day: "2-digit", month: "short" };
    if (date.getFullYear() !== today.getFullYear()) dateParts.year = "numeric";
    return `${new Intl.DateTimeFormat(language, dateParts).format(date)} ${time}`;
  }

  _openMoreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId },
      })
    );
  }
}

class HaStatusCard extends HaCardsBase {
  static getStubConfig(hass) {
    const entity = Object.keys(hass?.states || {}).find((id) => id.startsWith("sensor."));
    return {
      type: "custom:ha-status-card",
      title: "Status",
      entity,
      icon: "mdi:home-assistant",
      background_color: DEFAULTS.background_color,
      accent_color: DEFAULTS.accent_color,
      text_color: DEFAULTS.text_color,
    };
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;

    const entityId = this._config.entity;
    const secondaryEntityId = this._config.secondary_entity;
    const background = toCssColor(this._config.background_color, DEFAULTS.background_color);
    const accent = toCssColor(this._config.accent_color, DEFAULTS.accent_color);
    const text = toCssColor(this._config.text_color, DEFAULTS.text_color);
    const tile = toCssColor(this._config.tile_color, DEFAULTS.tile_color);
    const mainValue = entityId ? this._formatValue(entityId, Number(this._config.decimals || 0)) : this._t("empty");
    const secondaryValue = secondaryEntityId ? this._formatValue(secondaryEntityId, 1) : this._friendlyName(entityId);

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          background: ${background};
          color: ${text};
          border: none;
          border-radius: var(--ha-card-border-radius, 18px);
          padding: 16px;
          box-sizing: border-box;
          overflow: hidden;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        ha-icon {
          color: ${accent};
          width: 28px;
          height: 28px;
        }
        .title {
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.2;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .body {
          background: ${tile};
          border-radius: 14px;
          padding: 14px;
          cursor: ${entityId ? "pointer" : "default"};
        }
        .value {
          font-size: 2rem;
          font-weight: 800;
          line-height: 1.05;
          overflow-wrap: anywhere;
        }
        .secondary {
          margin-top: 6px;
          font-size: .82rem;
          opacity: .72;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      </style>
      <ha-card>
        <div class="header">
          <ha-icon icon="${this._config.icon || DEFAULTS.icon}"></ha-icon>
          <div class="title">${this._config.title || DEFAULTS.title}</div>
        </div>
        <div class="body" tabindex="0" role="button">
          <div class="value">${mainValue}</div>
          <div class="secondary">${secondaryValue || ""}</div>
        </div>
      </ha-card>
    `;

    this.shadowRoot.querySelector(".body")?.addEventListener("click", () => this._openMoreInfo(entityId));
  }
}

class HaMailboxCard extends HaCardsBase {
  constructor() {
    super();
    this._previousLux = undefined;
    this._lastOpened = undefined;
    this._lastDelta = undefined;
  }

  static getStubConfig(hass) {
    const entity = Object.keys(hass?.states || {}).find((id) => id.startsWith("sensor.") && id.includes("lux"));
    return {
      type: "custom:ha-mailbox-card",
      title: "Brievenbus",
      entity,
      motion_entity: Object.keys(hass?.states || {}).find((id) => id.startsWith("binary_sensor.") && id.includes("motion")),
      last_opened_entity: "input_datetime.brievenbus_laatst_geopend",
      threshold: 25,
      show_current_lux: true,
      show_lux_change: true,
      show_threshold: true,
      show_sensor_state: true,
      background_color: DEFAULTS.background_color,
      accent_color: DEFAULTS.accent_color,
      text_color: DEFAULTS.text_color,
      tile_color: DEFAULTS.tile_color,
      border_color: DEFAULTS.border_color,
    };
  }

  static getConfigElement() {
    return document.createElement("ha-mailbox-card-editor");
  }

  setConfig(config) {
    super.setConfig({ title: "Brievenbus", icon: "mdi:email-outline", ...config });
  }

  _storageKey(entityId) {
    return `ha-cards-mailbox:${entityId || "unknown"}`;
  }

  _loadStoredState(entityId) {
    if (!entityId || this._loadedEntityId === entityId) return;
    this._loadedEntityId = entityId;

    try {
      const stored = JSON.parse(localStorage.getItem(this._storageKey(entityId)) || "{}");
      this._previousLux = Number.isFinite(Number(stored.previousLux)) ? Number(stored.previousLux) : undefined;
      this._lastOpened = stored.lastOpened || undefined;
      this._lastDelta = Number.isFinite(Number(stored.lastDelta)) ? Number(stored.lastDelta) : undefined;
    } catch (err) {
      this._previousLux = undefined;
      this._lastOpened = undefined;
      this._lastDelta = undefined;
    }
  }

  _storeState(entityId) {
    if (!entityId) return;
    localStorage.setItem(
      this._storageKey(entityId),
      JSON.stringify({
        previousLux: this._previousLux,
        lastOpened: this._lastOpened,
        lastDelta: this._lastDelta,
      })
    );
  }

  _updateOpeningState(entityId, currentLux, threshold) {
    if (!Number.isFinite(currentLux)) return;

    this._loadStoredState(entityId);

    if (Number.isFinite(this._previousLux)) {
      const delta = Math.abs(currentLux - this._previousLux);
      if (delta >= threshold) {
        this._lastOpened = new Date().toISOString();
        this._lastDelta = delta;
      }
    }

    this._previousLux = currentLux;
    this._storeState(entityId);
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;

    const entityId = this._config.entity;
    const stateObj = this._state(entityId);
    const currentLux = Number(stateObj?.state);
    const threshold = Number(this._config.threshold || DEFAULTS.threshold);
    const safeThreshold = Number.isFinite(threshold) ? Math.max(0, threshold) : DEFAULTS.threshold;
    this._updateOpeningState(entityId, currentLux, safeThreshold);

    const background = toCssColor(this._config.background_color, DEFAULTS.background_color);
    const text = toCssColor(this._config.text_color, DEFAULTS.text_color);
    const mutedText = toCssColor(this._config.muted_text_color, DEFAULTS.muted_text_color);
    const tile = toCssColor(this._config.tile_color, DEFAULTS.tile_color);
    const border = toCssColor(this._config.border_color, DEFAULTS.border_color);
    const storedLastOpened = this._dateFromEntity(this._config.last_opened_entity);
    const motionDate = this._dateFromEntity(this._config.motion_entity, true);
    const localLastOpened = this._lastOpened ? new Date(this._lastOpened) : undefined;
    const postReceivedDate = motionDate || localLastOpened;
    const postReceived = postReceivedDate ? this._formatMailboxDateTime(postReceivedDate) : this._t("mailboxNoMotion");
    const lastEmptied = storedLastOpened ? this._formatMailboxDateTime(storedLastOpened) : "--";
    const currentLuxLabel = Number.isFinite(currentLux) ? `${Math.round(currentLux)} lx` : this._formatValue(entityId);
    const lastDeltaLabel = Number.isFinite(this._lastDelta) ? `${Math.round(this._lastDelta)} lx` : "--";
    const tiles = [
      this._config.show_current_lux !== false
        ? `<div class="tile">
            <div class="label">${this._t("mailboxCurrentLux")}</div>
            <div class="metric">${currentLuxLabel}</div>
          </div>`
        : "",
      this._config.show_lux_change !== false
        ? `<div class="tile">
            <div class="label">${this._t("mailboxLuxChange")}</div>
            <div class="metric">${lastDeltaLabel}</div>
          </div>`
        : "",
      this._config.show_threshold !== false
        ? `<div class="tile">
            <div class="label">${this._t("mailboxThreshold")}</div>
            <div class="metric">${Math.round(safeThreshold)} lx</div>
          </div>`
        : "",
      this._config.show_sensor_state !== false
        ? `<div class="tile">
            <div class="label">${this._friendlyName(entityId) ? "Sensor" : this._t("empty")}</div>
            <div class="metric">${stateObj?.state ? stateObj.state : "--"}</div>
          </div>`
        : "",
    ].join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          background: linear-gradient(180deg, ${background} 0%, #0d0e0f 100%);
          color: ${text};
          border: 1px solid ${border};
          border-radius: var(--ha-card-border-radius, 18px);
          padding: 16px;
          box-sizing: border-box;
          overflow: hidden;
          box-shadow: 0 16px 30px rgba(0,0,0,.24);
        }
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          text-align: left;
        }
        .header ha-icon {
          color: ${text};
          width: 22px;
          height: 22px;
          flex: 0 0 auto;
        }
        .title {
          font-size: 1rem;
          font-weight: 800;
          line-height: 1.1;
        }
        .header-meta {
          margin-left: auto;
          min-width: 0;
          text-align: right;
        }
        .header-meta.is-clickable,
        .visual.is-clickable {
          cursor: pointer;
        }
        .header-meta-label {
          color: ${mutedText};
          font-size: .62rem;
          font-weight: 800;
          line-height: 1.1;
        }
        .header-meta-value {
          margin-top: 2px;
          color: ${text};
          font-size: .74rem;
          font-weight: 900;
          line-height: 1.1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 140px;
        }
        .visual {
          display: grid;
          justify-items: center;
          gap: 8px;
          margin: 2px 0 14px;
          cursor: ${entityId ? "pointer" : "default"};
        }
        .mailbox {
          position: relative;
          width: 118px;
          height: 92px;
        }
        .backplate {
          position: absolute;
          inset: 8px 5px 3px;
          border-radius: 16px;
          background: #25262a;
          box-shadow: 0 14px 22px rgba(0,0,0,.26);
        }
        .box {
          position: absolute;
          inset: 16px 14px 11px;
          border-radius: 12px;
          border: 6px solid #2d2e33;
          background: linear-gradient(180deg, #73757b 0%, #55575e 100%);
          box-shadow: inset 0 0 0 2px rgba(255,255,255,.05);
        }
        .box::before {
          content: "";
          position: absolute;
          left: 14px;
          right: 14px;
          top: 14px;
          height: 7px;
          border-radius: 999px;
          background: #292a2f;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.1);
        }
        .lid {
          position: absolute;
          left: 22px;
          right: 22px;
          top: 3px;
          height: 18px;
          border-radius: 9px 9px 4px 4px;
          background: #303136;
          transform-origin: bottom center;
          transform: rotateX(${postReceivedDate ? "28deg" : "0deg"});
          opacity: ${postReceivedDate ? ".98" : ".72"};
        }
        .envelope {
          position: absolute;
          left: 35px;
          right: 35px;
          bottom: 22px;
          height: 26px;
          border-radius: 4px;
          background: #c7c8cc;
          clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
          opacity: ${postReceivedDate ? ".96" : ".46"};
        }
        .envelope::before,
        .envelope::after {
          content: "";
          position: absolute;
          inset: 0;
          background: #97999f;
          clip-path: polygon(0 0, 50% 58%, 100% 0, 100% 13%, 50% 72%, 0 13%);
        }
        .envelope::after {
          background: #85878d;
          clip-path: polygon(0 100%, 50% 42%, 100% 100%);
        }
        .opened-label {
          color: ${mutedText};
          font-size: .7rem;
          font-weight: 800;
          line-height: 1;
        }
        .opened {
          max-width: 100%;
          text-align: center;
          font-size: 1.34rem;
          font-weight: 900;
          line-height: 1.08;
          overflow-wrap: anywhere;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .grid:empty { display: none; }
        .tile {
          min-height: 55px;
          border-radius: 10px;
          background: ${tile};
          border: 1px solid ${border};
          display: grid;
          align-content: center;
          justify-items: center;
          padding: 8px;
          box-sizing: border-box;
        }
        .label {
          color: ${mutedText};
          font-size: .63rem;
          font-weight: 800;
          text-align: center;
        }
        .metric {
          margin-top: 5px;
          font-size: .9rem;
          font-weight: 900;
          text-align: center;
          overflow-wrap: anywhere;
        }
      </style>
      <ha-card>
        <div class="header">
          <ha-icon icon="${this._config.icon || "mdi:mailbox-up"}"></ha-icon>
          <div class="title">${this._config.title || "Brievenbus"}</div>
          <div class="header-meta ${this._config.motion_entity ? "is-clickable" : ""}" tabindex="0" role="button">
            <div class="header-meta-label">${this._t("mailboxLastEmptied")}</div>
            <div class="header-meta-value">${lastEmptied}</div>
          </div>
        </div>
        <div class="visual ${entityId ? "is-clickable" : ""}" tabindex="0" role="button">
          <div class="mailbox" aria-hidden="true">
            <div class="backplate"></div>
            <div class="lid"></div>
            <div class="box"></div>
            <div class="envelope"></div>
          </div>
          <div class="opened-label">${this._t("mailboxLastOpened")}</div>
          <div class="opened">${postReceived}</div>
        </div>
        <div class="grid">
          ${tiles}
        </div>
      </ha-card>
    `;

    this.shadowRoot.querySelector(".header-meta")?.addEventListener("click", () => this._openMoreInfo(entityId));
    this.shadowRoot.querySelector(".visual")?.addEventListener("click", () => this._openMoreInfo(this._config.motion_entity));
  }
}

class HaMailboxCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = undefined;
    this._form = undefined;
    this._initialized = false;
  }

  setConfig(config) {
    this._config = {
      title: "Brievenbus",
      threshold: DEFAULTS.threshold,
      motion_entity: undefined,
      last_opened_entity: undefined,
      show_current_lux: true,
      show_lux_change: true,
      show_threshold: true,
      show_sensor_state: true,
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateForm();
  }

  _render() {
    if (!this.shadowRoot || this._initialized) {
      this._updateForm();
      return;
    }

    this._initialized = true;

    this.shadowRoot.innerHTML = `
      <style>
        ha-form { display: block; }
      </style>
      <ha-form></ha-form>
    `;

    this._form = this.shadowRoot.querySelector("ha-form");
    this._form.schema = [
      { name: "title", selector: { text: {} } },
      { name: "entity", required: true, selector: { entity: { domain: "sensor" } } },
      { name: "motion_entity", selector: { entity: { domain: "binary_sensor" } } },
      { name: "last_opened_entity", selector: { entity: {} } },
      { name: "threshold", selector: { number: { min: 0, step: 1, mode: "box", unit_of_measurement: "lx" } } },
      { name: "show_current_lux", selector: { boolean: {} } },
      { name: "show_lux_change", selector: { boolean: {} } },
      { name: "show_threshold", selector: { boolean: {} } },
      { name: "show_sensor_state", selector: { boolean: {} } },
    ];
    this._form.computeLabel = (schema) => MAILBOX_EDITOR_LABELS[schema.name] || schema.name;
    this._form.addEventListener("value-changed", (event) => {
      this._config = event.detail.value;
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          bubbles: true,
          composed: true,
          detail: { config: this._config },
        })
      );
    });
    this._updateForm();
  }

  _updateForm() {
    if (!this._form) return;
    this._form.hass = this._hass;
    this._form.data = this._config;
  }
}

class HaCrawlspaceCard extends HaCardsBase {
  static getStubConfig(hass) {
    const sensorIds = Object.keys(hass?.states || {}).filter((id) => id.startsWith("sensor."));
    return {
      type: "custom:ha-crawlspace-card",
      title: "Kruipruimte",
      temperature_entity: sensorIds.find((id) => id.includes("temperatuur") || id.includes("temperature")),
      humidity_entity: sensorIds.find((id) => id.includes("vocht") || id.includes("humidity")),
      icon: "mdi:home-floor-negative-1",
      background_color: DEFAULTS.background_color,
      text_color: DEFAULTS.text_color,
      tile_color: DEFAULTS.tile_color,
      border_color: DEFAULTS.border_color,
    };
  }

  static getConfigElement() {
    return document.createElement("ha-crawlspace-card-editor");
  }

  setConfig(config) {
    super.setConfig({ title: "Kruipruimte", icon: "mdi:home-floor-negative-1", ...config });
  }

  _numericValue(entityId) {
    const stateObj = this._state(entityId);
    if (!stateObj || ["unavailable", "unknown"].includes(stateObj.state)) return undefined;
    const value = Number(stateObj.state);
    return Number.isFinite(value) ? value : undefined;
  }

  _formatClimateValue(entityId, fallbackUnit) {
    const stateObj = this._state(entityId);
    const value = this._numericValue(entityId);
    if (value === undefined) return stateObj ? this._formatValue(entityId, 1) : "--";
    const language = this._hass?.locale?.language || this._hass?.language || "nl";
    const unit = stateObj?.attributes?.unit_of_measurement || fallbackUnit;
    return `${value.toLocaleString(language, { maximumFractionDigits: 1 })} ${unit}`;
  }

  _moldRisk(temperature, humidity) {
    if (temperature === undefined || humidity === undefined) return undefined;

    const humidityRisk = Math.max(0, Math.min(86, (humidity - 52) * 2.15));
    const temperatureFactor = temperature >= 10 && temperature <= 30 ? 14 : temperature >= 5 && temperature <= 35 ? 7 : 2;
    const score = Math.round(Math.min(99, humidityRisk + temperatureFactor));
    const key = score >= 75 ? "crawlspaceRiskVeryHigh" : score >= 50 ? "crawlspaceRiskHigh" : score >= 25 ? "crawlspaceRiskElevated" : "crawlspaceRiskLow";
    return { score, label: this._t(key) };
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;

    const temperatureEntity = this._config.temperature_entity;
    const humidityEntity = this._config.humidity_entity;
    const temperature = this._numericValue(temperatureEntity);
    const humidity = this._numericValue(humidityEntity);
    const risk = this._moldRisk(temperature, humidity);
    const background = toCssColor(this._config.background_color, DEFAULTS.background_color);
    const text = toCssColor(this._config.text_color, DEFAULTS.text_color);
    const mutedText = toCssColor(this._config.muted_text_color, DEFAULTS.muted_text_color);
    const tile = toCssColor(this._config.tile_color, DEFAULTS.tile_color);
    const border = toCssColor(this._config.border_color, DEFAULTS.border_color);
    const riskClass = risk ? (risk.score >= 75 ? "very-high" : risk.score >= 50 ? "high" : risk.score >= 25 ? "elevated" : "low") : "unknown";

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          background: linear-gradient(180deg, ${background} 0%, #0d0e0f 100%);
          color: ${text};
          border: 1px solid ${border};
          border-radius: var(--ha-card-border-radius, 18px);
          padding: 16px;
          box-sizing: border-box;
          overflow: hidden;
          box-shadow: 0 16px 30px rgba(0,0,0,.24);
        }
        .header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .header ha-icon { width: 23px; height: 23px; color: ${text}; }
        .title { font-size: 1rem; font-weight: 800; line-height: 1.1; }
        .metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .metric { min-width: 0; min-height: 84px; padding: 12px; border: 1px solid ${border}; border-radius: 10px; background: ${tile}; box-sizing: border-box; }
        .metric.risk { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .metric.clickable { cursor: pointer; }
        .label { color: ${mutedText}; font-size: .7rem; font-weight: 800; line-height: 1.1; }
        .value { margin-top: 8px; font-size: 1.45rem; font-weight: 900; line-height: 1; overflow-wrap: anywhere; }
        .risk .value { margin-top: 5px; }
        .risk-score { flex: 0 0 auto; width: 58px; height: 58px; display: grid; place-items: center; border-radius: 50%; border: 4px solid currentColor; color: #8fd3ff; font-size: 1rem; font-weight: 900; }
        .risk-score.low { color: #8fd3ff; }
        .risk-score.elevated { color: #d5c777; }
        .risk-score.high { color: #e6a36f; }
        .risk-score.very-high { color: #e88484; }
        .risk-score.unknown { color: ${mutedText}; }
        .note { margin-top: 11px; color: ${mutedText}; font-size: .68rem; line-height: 1.3; }
      </style>
      <ha-card>
        <div class="header">
          <ha-icon icon="${this._config.icon || "mdi:home-floor-negative-1"}"></ha-icon>
          <div class="title">${this._config.title || "Kruipruimte"}</div>
        </div>
        <div class="metrics">
          <div class="metric clickable" data-entity="${temperatureEntity || ""}" tabindex="0" role="button">
            <div class="label">${this._t("crawlspaceTemperature")}</div>
            <div class="value">${this._formatClimateValue(temperatureEntity, "°C")}</div>
          </div>
          <div class="metric clickable" data-entity="${humidityEntity || ""}" tabindex="0" role="button">
            <div class="label">${this._t("crawlspaceHumidity")}</div>
            <div class="value">${this._formatClimateValue(humidityEntity, "%")}</div>
          </div>
          <div class="metric risk">
            <div>
              <div class="label">${this._t("crawlspaceMoldRisk")}</div>
              <div class="value">${risk ? `${risk.label} · ${risk.score}%` : "--"}</div>
            </div>
            <div class="risk-score ${riskClass}">${risk ? `${risk.score}%` : "--"}</div>
          </div>
        </div>
        <div class="note">${this._t("crawlspaceRiskNote")}</div>
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll("[data-entity]").forEach((element) => {
      if (!element.dataset.entity) return;
      element.addEventListener("click", () => this._openMoreInfo(element.dataset.entity));
    });
  }
}

class HaCrawlspaceCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = undefined;
    this._form = undefined;
    this._initialized = false;
  }

  setConfig(config) {
    this._config = { title: "Kruipruimte", ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateForm();
  }

  _render() {
    if (!this.shadowRoot || this._initialized) {
      this._updateForm();
      return;
    }

    this._initialized = true;
    this.shadowRoot.innerHTML = `<ha-form></ha-form>`;
    this._form = this.shadowRoot.querySelector("ha-form");
    this._form.schema = [
      { name: "title", selector: { text: {} } },
      { name: "temperature_entity", required: true, selector: { entity: { domain: "sensor", device_class: "temperature" } } },
      { name: "humidity_entity", required: true, selector: { entity: { domain: "sensor", device_class: "humidity" } } },
    ];
    this._form.computeLabel = (schema) => ({
      title: "Titel",
      temperature_entity: "Temperatuursensor",
      humidity_entity: "Luchtvochtigheidssensor",
    }[schema.name] || schema.name);
    this._form.addEventListener("value-changed", (event) => {
      this._config = event.detail.value;
      this.dispatchEvent(new CustomEvent("config-changed", {
        bubbles: true,
        composed: true,
        detail: { config: this._config },
      }));
    });
    this._updateForm();
  }

  _updateForm() {
    if (!this._form) return;
    this._form.hass = this._hass;
    this._form.data = this._config;
  }
}

class HaWasteCard extends HaCardsBase {
  static getStubConfig(hass) {
    const sensorIds = Object.keys(hass?.states || {}).filter((id) => id.startsWith("sensor."));
    return {
      type: "custom:ha-waste-card",
      title: "Afval",
      gft_entity: sensorIds.find((id) => id.includes("gft")),
      paper_entity: sensorIds.find((id) => id.includes("papier") || id.includes("paper")),
      pmd_entity: sensorIds.find((id) => id.includes("pmd") || id.includes("rest")),
      show_today: true,
      show_tomorrow: true,
      show_waste_types: true,
      background_color: DEFAULTS.background_color,
      text_color: DEFAULTS.text_color,
      tile_color: DEFAULTS.tile_color,
      border_color: DEFAULTS.border_color,
    };
  }

  static getConfigElement() {
    return document.createElement("ha-waste-card-editor");
  }

  setConfig(config) {
    super.setConfig({ title: "Afval", icon: "mdi:trash-can-outline", ...config });
  }

  _wasteTypes() {
    return [
      { key: "gft", name: "GFT", entity: this._config.gft_entity, icon: "mdi:recycle", color: "#41d477" },
      { key: "paper", name: "Papier / Karton", entity: this._config.paper_entity, icon: "mdi:package-variant", color: "#55b7ff" },
      { key: "pmd", name: "PMD/Rest", entity: this._config.pmd_entity, icon: "mdi:circle", color: "#ff8b55" },
      { key: "rest", name: "Rest", entity: this._config.rest_entity, icon: "mdi:trash-can", color: "#b7b7b7" },
    ].filter((item) => item.entity);
  }

  _parseWasteDate(entityId) {
    const stateObj = this._state(entityId);
    if (!stateObj || ["unavailable", "unknown"].includes(stateObj.state)) return undefined;

    const timestamp = Number(stateObj.attributes?.timestamp);
    if (Number.isFinite(timestamp)) return this._startOfDay(new Date(timestamp * 1000));

    const state = String(stateObj.state).trim();
    const lowerState = state.toLowerCase();
    if (["today", "vandaag"].includes(lowerState)) return this._startOfDay(new Date());
    if (["tomorrow", "morgen"].includes(lowerState)) {
      const tomorrow = this._startOfDay(new Date());
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }

    const iso = state.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

    const dutch = state.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dutch) return new Date(Number(dutch[3]), Number(dutch[2]) - 1, Number(dutch[1]));

    const parsed = new Date(state);
    return Number.isNaN(parsed.getTime()) ? undefined : this._startOfDay(parsed);
  }

  _startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  _dayDiff(date) {
    const today = this._startOfDay(new Date());
    return Math.round((this._startOfDay(date).getTime() - today.getTime()) / 86400000);
  }

  _formatWasteDate(date) {
    if (!date) return "--";
    const language = this._hass?.locale?.language || this._hass?.language || "nl";
    return new Intl.DateTimeFormat(language, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  _collections() {
    return this._wasteTypes()
      .map((item) => ({ ...item, date: this._parseWasteDate(item.entity) }))
      .filter((item) => item.date)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  _summaryForDay(collections, dayOffset, emptyText) {
    const names = collections.filter((item) => this._dayDiff(item.date) === dayOffset).map((item) => item.name);
    return names.length ? names.join(" + ") : emptyText;
  }

  _renderInfoTile(title, subtitle, entityId) {
    return `
      <div class="tile" ${entityId ? `data-entity="${entityId}"` : ""}>
        <div class="summary-title"><span>${title}</span></div>
        <div class="summary-subtitle">${subtitle}</div>
      </div>
    `;
  }

  _renderWasteTile(item) {
    return `
      <div class="tile waste-tile" data-entity="${item.entity}">
        <div class="waste-title">
          <span>${item.name}</span>
        </div>
        <div class="waste-date">${this._formatWasteDate(item.date)}</div>
      </div>
    `;
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;

    const background = toCssColor(this._config.background_color, DEFAULTS.background_color);
    const text = toCssColor(this._config.text_color, DEFAULTS.text_color);
    const mutedText = toCssColor(this._config.muted_text_color, DEFAULTS.muted_text_color);
    const tile = toCssColor(this._config.tile_color, DEFAULTS.tile_color);
    const border = toCssColor(this._config.border_color, DEFAULTS.border_color);
    const collections = this._collections();
    const todayStatus = this._summaryForDay(collections, 0, this._t("wasteNoneToday"));
    const lowerTiles = [
      this._config.show_tomorrow !== false
        ? this._renderInfoTile(this._t("wasteTomorrow"), this._summaryForDay(collections, 1, this._t("wasteNoneTomorrow")))
        : "",
      this._config.show_waste_types !== false ? collections.map((item) => this._renderWasteTile(item)).join("") : "",
    ].join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          background: linear-gradient(180deg, ${background} 0%, #0d0e0f 100%);
          color: ${text};
          border: 1px solid ${border};
          border-radius: var(--ha-card-border-radius, 18px);
          padding: 16px;
          box-sizing: border-box;
          overflow: hidden;
          box-shadow: 0 16px 30px rgba(0,0,0,.24);
        }
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          text-align: left;
        }
        .header ha-icon {
          color: ${text};
          width: 22px;
          height: 22px;
          flex: 0 0 auto;
        }
        .title {
          font-size: 1rem;
          font-weight: 800;
          line-height: 1.1;
        }
        .visual {
          display: grid;
          justify-items: center;
          gap: 8px;
          margin: 2px 0 14px;
        }
        .wheelie-bin {
          position: relative;
          width: 112px;
          height: 112px;
        }
        .bin-lid {
          position: absolute;
          left: 23px;
          right: 14px;
          top: 11px;
          height: 14px;
          border-radius: 7px 7px 3px 3px;
          background: #2c2d32;
          transform: rotate(-4deg);
          transform-origin: left bottom;
        }
        .bin-lid::before {
          content: "";
          position: absolute;
          left: 12px;
          top: -8px;
          width: 42px;
          height: 8px;
          border-radius: 5px 5px 0 0;
          background: #25262a;
        }
        .bin-handle {
          position: absolute;
          right: 6px;
          top: 31px;
          width: 19px;
          height: 44px;
          border: 7px solid #2b2c31;
          border-left: 0;
          border-radius: 0 14px 14px 0;
        }
        .bin-body {
          position: absolute;
          left: 21px;
          right: 22px;
          top: 25px;
          bottom: 16px;
          border: 7px solid #2d2e33;
          border-radius: 12px 12px 16px 16px;
          background: linear-gradient(180deg, #74767c 0%, #55575e 100%);
          box-shadow: inset 0 0 0 2px rgba(255,255,255,.05), 0 14px 22px rgba(0,0,0,.24);
          transform: skewX(-3deg);
        }
        .bin-body::before {
          content: "";
          position: absolute;
          left: 14px;
          right: 14px;
          top: 14px;
          height: 8px;
          border-radius: 999px;
          background: rgba(37,38,42,.8);
        }
        .bin-body::after {
          content: "";
          position: absolute;
          left: 17px;
          right: 17px;
          bottom: 14px;
          height: 28px;
          border-left: 4px solid rgba(37,38,42,.42);
          border-right: 4px solid rgba(37,38,42,.42);
        }
        .wheel {
          position: absolute;
          bottom: 7px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #242528;
          box-shadow: inset 0 0 0 4px #3a3b40;
        }
        .wheel.left { left: 28px; }
        .wheel.right { right: 29px; }
        .today-label {
          color: ${mutedText};
          font-size: .7rem;
          font-weight: 800;
          line-height: 1;
        }
        .today-status {
          max-width: 100%;
          text-align: center;
          font-size: 1.34rem;
          font-weight: 900;
          line-height: 1.08;
          overflow-wrap: anywhere;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .grid:empty { display: none; }
        .tile {
          min-height: 58px;
          border-radius: 8px;
          background: ${tile};
          border: 1px solid ${border};
          display: grid;
          align-content: center;
          justify-items: center;
          padding: 10px;
          box-sizing: border-box;
          cursor: pointer;
        }
        .summary-title,
        .waste-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          max-width: 100%;
          font-size: .96rem;
          font-weight: 900;
          line-height: 1.1;
          text-align: center;
        }
        .summary-subtitle,
        .waste-date {
          margin-top: 4px;
          color: ${text};
          font-size: .78rem;
          font-weight: 800;
          line-height: 1.15;
          text-align: center;
          overflow-wrap: anywhere;
        }
        .summary-subtitle { color: ${text}; }
        .waste-tile { min-height: 60px; }
        .empty {
          min-height: 58px;
          color: ${mutedText};
          display: grid;
          place-items: center;
          text-align: center;
          font-size: .8rem;
          font-weight: 800;
        }
      </style>
      <ha-card>
        <div class="header">
          <ha-icon icon="${this._config.icon || "mdi:trash-can-outline"}"></ha-icon>
          <div class="title">${this._config.title || "Afval"}</div>
        </div>
        <div class="visual">
          <div class="wheelie-bin" aria-hidden="true">
            <div class="bin-lid"></div>
            <div class="bin-handle"></div>
            <div class="bin-body"></div>
            <div class="wheel left"></div>
            <div class="wheel right"></div>
          </div>
          <div class="today-label">${this._t("wasteToday")}</div>
          <div class="today-status">${this._config.show_today !== false ? todayStatus : "--"}</div>
        </div>
        <div class="grid">
          ${lowerTiles || `<div class="empty">${this._t("empty")}</div>`}
        </div>
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll("[data-entity]").forEach((tileElement) => {
      tileElement.addEventListener("click", () => this._openMoreInfo(tileElement.dataset.entity));
    });
  }
}

class HaWasteCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = undefined;
    this._form = undefined;
    this._initialized = false;
  }

  setConfig(config) {
    this._config = {
      title: "Afval",
      show_today: true,
      show_tomorrow: true,
      show_waste_types: true,
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateForm();
  }

  _render() {
    if (!this.shadowRoot || this._initialized) {
      this._updateForm();
      return;
    }

    this._initialized = true;
    this.shadowRoot.innerHTML = `<ha-form></ha-form>`;
    this._form = this.shadowRoot.querySelector("ha-form");
    this._form.schema = [
      { name: "title", selector: { text: {} } },
      { name: "gft_entity", selector: { entity: { domain: "sensor" } } },
      { name: "paper_entity", selector: { entity: { domain: "sensor" } } },
      { name: "pmd_entity", selector: { entity: { domain: "sensor" } } },
      { name: "rest_entity", selector: { entity: { domain: "sensor" } } },
      { name: "show_today", selector: { boolean: {} } },
      { name: "show_tomorrow", selector: { boolean: {} } },
      { name: "show_waste_types", selector: { boolean: {} } },
    ];
    this._form.computeLabel = (schema) => WASTE_EDITOR_LABELS[schema.name] || schema.name;
    this._form.addEventListener("value-changed", (event) => {
      this._config = event.detail.value;
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          bubbles: true,
          composed: true,
          detail: { config: this._config },
        })
      );
    });
    this._updateForm();
  }

  _updateForm() {
    if (!this._form) return;
    this._form.hass = this._hass;
    this._form.data = this._config;
  }
}

customElements.define("ha-status-card", HaStatusCard);
customElements.define("ha-mailbox-card", HaMailboxCard);
customElements.define("ha-mailbox-card-editor", HaMailboxCardEditor);
customElements.define("ha-crawlspace-card", HaCrawlspaceCard);
customElements.define("ha-crawlspace-card-editor", HaCrawlspaceCardEditor);
customElements.define("ha-waste-card", HaWasteCard);
customElements.define("ha-waste-card-editor", HaWasteCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ha-status-card",
  name: "HA Status Card",
  description: "Compacte statuskaart voor een Home Assistant entiteit.",
});
window.customCards.push({
  type: "ha-mailbox-card",
  name: "HA Mailbox Card",
  description: "Brievenbuskaart die de laatste grote luxverandering als opening toont.",
});
window.customCards.push({
  type: "ha-crawlspace-card",
  name: "HA Crawlspace Card",
  description: "Temperatuur-, luchtvochtigheids- en indicatieve schimmelrisicokaart voor een kruipruimte.",
});
window.customCards.push({
  type: "ha-waste-card",
  name: "HA Waste Card",
  description: "Donkere afvalkalenderkaart met vandaag, morgen en komende ophaaldatums.",
});
