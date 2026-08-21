# HA Cards

Verzamelproject voor Home Assistant dashboardkaarten. De kaarten zijn bedoeld als HACS custom dashboard resource en worden gebundeld in `ha-cards.js`.

![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)
![Version](https://img.shields.io/badge/Version-1.0.3-blue.svg)

## Kaarten

### HA Status Card (`custom:ha-status-card`)

Een compacte kaart voor een enkele Home Assistant entiteit:

- Titel en icoon bovenaan
- Grote primaire waarde met een optionele tweede entiteit
- Klik opent de meer-info popup van de primaire entiteit
- Instelbare achtergrond-, accent-, tekst- en tegelkleur

### HA Mailbox Card (`custom:ha-mailbox-card`)

Een donkere brievenbuskaart met een grote brievenbus bovenin en de status daaronder. De kaart gebruikt een bewegingssensor voor `Post ontvangen` en een aparte helper-entiteit voor `Laatst geleegd`.

- Toont linksboven `Laatst geleegd` via een aparte entiteit
- Toont centraal `Post ontvangen` met datum/tijd op basis van een bewegingssensor
- Drempel instelbaar met `threshold`
- Laat huidige luxwaarde, laatste luxverschil en drempel zien
- Onderste vier blokken zijn in de UI-editor met vinkjes aan of uit te zetten
- Kan een Home Assistant entiteit zoals `input_datetime.brievenbus_laatst_geopend` tonen, zodat registratie ook werkt zonder open dashboard

### HA Waste Card (`custom:ha-waste-card`)

Een donkere afvalkalenderkaart in dezelfde stijl als de brievenbuskaart, met een grote kliko bovenin en status eronder.

- Toont of er vandaag afval wordt opgehaald
- Toont of er morgen afval wordt opgehaald
- Toont komende datums voor GFT, Papier / Karton, PMD/Rest en optioneel Rest
- Entiteiten en blokken zijn bewerkbaar in de UI-editor

## Installatie via HACS

1. HACS -> **Custom repositories** -> `https://github.com/Thedeed99/HA-CARDS`, type **Dashboard**
2. Downloaden en Home Assistant herstarten
3. Dashboard -> kaart toevoegen -> **HA Waste Card**, **HA Mailbox Card** of **HA Status Card**

## Configuratie

```yaml
type: custom:ha-status-card
title: Woonkamer
entity: sensor.woonkamer_temperatuur
secondary_entity: sensor.woonkamer_luchtvochtigheid
icon: mdi:sofa
background_color: "#101112"
accent_color: "#d8d8d8"
text_color: "#ffffff"
```

```yaml
type: custom:ha-mailbox-card
title: Brievenbus
entity: sensor.brievenbus_illuminance
motion_entity: binary_sensor.brievenbus_beweging
last_opened_entity: input_datetime.brievenbus_laatst_geopend
threshold: 35
background_color: "#101112"
text_color: "#ffffff"
muted_text_color: "#a7a7a7"
tile_color: "#1a1b1d"
border_color: "#2a2b2e"
show_current_lux: true
show_lux_change: true
show_threshold: true
show_sensor_state: true
```

```yaml
type: custom:ha-waste-card
title: Afval
gft_entity: sensor.gft
paper_entity: sensor.papier_karton
pmd_entity: sensor.pmd_rest
rest_entity: sensor.restafval
show_today: true
show_tomorrow: true
show_waste_types: true
background_color: "#101112"
text_color: "#ffffff"
muted_text_color: "#a7a7a7"
tile_color: "#1a1b1d"
border_color: "#2a2b2e"
```

Voor registratie zonder open dashboard maak je in Home Assistant een `input_datetime` en automation aan. Zie [examples/mailbox-package.yaml](examples/mailbox-package.yaml) voor een compleet voorbeeld.

## Ontwikkelen

Plaats nieuwe kaarten in `ha-cards.js` of splits ze later op en bundel ze terug naar `ha-cards.js`. Elke kaart registreert zichzelf met `customElements.define(...)` en voegt metadata toe aan `window.customCards`.

## Licentie

MIT
