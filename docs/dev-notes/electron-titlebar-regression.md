# Electron fijado en 44.0.0 exacto — regresión de clic en la titlebar propia

## Qué pasó

La migración M11d (`3429459`) subió Electron de `33.0.0` a `^44.3.0` porque 33
había salido de la ventana de 4 versiones estables soportadas por Electron.
El commit documentó "cero cambios de código" y quedó verificado en ese momento
— pero no se probó específicamente con **clics reales de mouse** (no
sintéticos) sobre los botones de la titlebar propia (`#tb-min`/`#tb-max`/
`#tb-close`, `frame:false` en `main.js`).

En algún punto entre `44.0.0` y lo que resolvía `^44.3.0` al instalar, esos
tres botones (y, por la misma razón, el plegado/despliegue del modo widget al
pegarlo a un borde de pantalla — necesita `frame:false` para poder achicar la
ventana a `setMinimumSize(1,1)`, algo que un marco nativo no permite) dejaron
de responder a un clic real. Los mismos botones SÍ respondían a un clic
sintético (`element.click()`/CDP), lo que hizo el diagnóstico especialmente
confuso — apuntaba a un bug de la app cuando en realidad era del runtime.

## Cómo se confirmó

Bisección binaria entre Electron 33 (bien) y `^44.3.0` (mal), probando cada
versión con la app real instalada y clics reales del usuario:

| Versión | Resultado |
|---|---|
| 33.0.0 | ✅ bien |
| 38.0.0 | ✅ bien |
| 41.0.0 | ✅ bien |
| 42.0.0 | ✅ bien |
| 43.0.0 | ✅ bien |
| 44.0.0 | ✅ bien |
| `^44.3.0` (lo que estaba instalado) | ❌ mal |

Es decir: toda la serie 33→44.0.0 funciona. La regresión está en algún parche
posterior a `44.0.0` dentro de la propia serie 44.x (no se acotó el patch
exacto — no hacía falta para decidir qué versión usar).

## Qué se hizo

`package.json` fija `"electron": "44.0.0"` **sin `^`** — a propósito, para que
un `npm install`/`npm update` de rutina no vuelva a subir a un patch de la
44.x con la regresión sin que nadie se entere.

## Antes de volver a tocar esto

- **No cambiar la versión de Electron sin volver a probar clic real** (no
  sintético) en los 3 botones de la titlebar propia + plegado del modo widget
  en un borde de pantalla, con la app ya empaquetada (`npm run dist`), no en
  modo dev.
- Si en el futuro se quiere subir de versión (por seguridad — 44.0.0 también
  va a salir de la ventana soportada eventualmente), repetir la bisección
  contra la nueva versión objetivo antes de fijarla.
- Vale la pena, en algún momento con tiempo, acotar el patch exacto donde
  rompe (probar 44.1.0, 44.2.0, 44.3.0 uno por uno) y reportarlo como issue en
  `electron/electron` en GitHub — no se encontró un issue ya abierto que
  coincida con este síntoma exacto (clic real vs. sintético en botones
  custom de `frame:false`) al buscar durante este diagnóstico.
