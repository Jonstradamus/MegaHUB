# MegaHUB

MegaHUB es una aplicación de escritorio para Windows que junta toda tu biblioteca de juegos, sin importar de dónde vengan, en un solo lugar. Es el proyecto hermano de DERIVA, pensado para la gente que tiene sus juegos repartidos entre Steam, Epic, GOG, Battle.net, Riot, Xbox y un puñado de launchers más, además de una carpeta de ROMs que nunca terminó de tener un hogar decente.

La idea de fondo es simple. Ya existe demasiada fricción entre abrir cinco programas distintos solo para recordar qué tenés instalado y dónde. MegaHUB escanea todo eso automáticamente y te lo muestra como una sola biblioteca, con carátulas, tiempo jugado, logros y ofertas, todo en el mismo lugar.

## Biblioteca unificada

MegaHUB detecta lo que tenés instalado en Steam, Epic Games, GOG, Battle.net, Riot Games, Xbox (incluyendo Game Pass y juegos UWP), Rockstar Games Launcher, Ubisoft Connect y EA App. No hace falta iniciar sesión en cada uno por separado dentro de MegaHUB: lee lo que esos launchers ya tienen guardado en el sistema y arma la biblioteca a partir de ahí.

Todo se puede ver en formato dock, como una grilla de carátulas, o en formato lista, más compacto para bibliotecas grandes. Hay filtros por plataforma, por género y un buscador que cruza toda la biblioteca de una sola vez, sin importar en qué launcher esté cada juego.

## Modo retro y emulación

Esta es probablemente la parte más ambiciosa del proyecto. MegaHUB organiza y lanza juegos para treinta y siete sistemas distintos, desde consolas de los ochenta como la Atari 2600 o la Colecovision hasta PlayStation 3 y Xbox 360, pasando por arcade, Neo Geo, Game Boy, Dreamcast, Nintendo 64, Nintendo 3DS y muchos más.

La aplicación crea una carpeta ordenada por consola dentro de tu carpeta de Documentos, con una estructura clara para emuladores y ROMs. Si ya tenés tus emuladores o tu colección en otro disco, podés indicarle esa ubicación en vez de mudar todo. MegaHUB nunca descarga ni distribuye BIOS ni ROMs, porque son archivos con derechos de autor, pero sí puede avisarte si te falta el BIOS que necesita un sistema para arrancar y dónde tenés que ponerlo.

Para los sistemas que corren bajo RetroArch, MegaHUB puede descargar el core correspondiente directo desde el servidor oficial de compilaciones de RetroArch, y también instalar temas visuales para el menú, siempre pidiendo confirmación antes de bajar nada. Para las consolas que usan emuladores independientes, como PS2, PS3, GameCube, Wii, Xbox o Xbox 360, hay descarga automática cuando existe una fuente verificada y portable, y enlace directo a la página oficial cuando no.

Las carátulas y la información de cada juego retro salen del mismo repositorio de miniaturas que usa el propio RetroArch, sin necesidad de ninguna clave. Cuando el nombre del archivo no alcanza para saber qué juego es realmente, MegaHUB puede leer la cabecera interna de la ROM o la imagen de disco para identificarlo con precisión, en vez de confiar en cómo esté nombrada la carpeta.

## Logros y progreso

MegaHUB combina varias fuentes de logros según de dónde venga cada juego. Para Steam usa las horas reales que ya guarda el propio launcher. Para los juegos que se lanzan desde MegaHUB en modo retro, mide la sesión real de principio a fin. Para el resto de launchers, que se abren por protocolo externo y no le devuelven ningún proceso que vigilar, MegaHUB solo puede registrar cuándo lanzaste algo, nunca inventa una duración que no puede medir.

Sobre esa base hay un motor de logros propio, con niveles por horas jugadas tanto globales como por juego y por consola. Se suma también una integración con RetroAchievements para quienes juegan ROMs a través de RetroArch, lectura de los gamerscore reales de Xbox 360 cuando se emula con Xenia, y lectura de los trofeos reales de PlayStation 3 cuando se emula con RPCS3. Nada de esto se inventa: cada número sale de un archivo real que generó el propio emulador o el propio launcher.

## Ofertas

Hay una sección de ofertas que consulta CheapShark, una API pública y gratuita que sigue los precios en Steam, GOG, Epic Games y otro puñado de tiendas más chicas. Además de mostrar las rebajas activas, MegaHUB arma una lista de recomendaciones según qué microgénero jugás más, cruzando tus horas reales de Steam con un mapa curado a mano de qué juegos pertenecen a qué microgénero, algo que Steam no distingue por sí solo más allá de categorías amplias como acción o rol.

## Requisitos y rendimiento

MegaHUB puede leer las especificaciones reales de tu computadora, procesador, memoria y tarjeta gráfica, y compararlas contra los requisitos mínimos y recomendados de cada juego para darte una idea de si tu equipo lo puede correr. Para juegos que no vienen de Steam, busca su equivalente en la tienda de Steam solo para conseguir esos requisitos, ya que es la única fuente pública que los publica de forma estructurada. Para los pocos juegos de Riot, que no tiene una API de requisitos, la información está cargada a mano desde sus páginas oficiales de soporte.

Para los emuladores de consolas más exigentes, como PS2, PS3, Xbox, Xbox 360, GameCube y Wii, MegaHUB puede aplicar preajustes de resolución y rendimiento directamente sobre la configuración real de cada emulador, pensados para acercarte a mejor definición sin que tengas que andar tocando archivos de configuración a mano.

## Conexión con DERIVA

MegaHUB se lleva bien con DERIVA Companion, la aplicación de escritorio de DERIVA. Cuando ambas están corriendo, MegaHUB le informa a DERIVA qué estás jugando en tiempo real, sin importar si el juego viene de Steam, de otro launcher o de un emulador, algo que antes solo pasaba con juegos de Steam. Esa información alimenta el mapa de tu perfil en DERIVA, tu Rich Presence de Discord y tus logros recientes.

La comunicación va en las dos direcciones. Mientras jugás, el gatito de DERIVA Companion puede seguir mostrándose sobre la ventana del emulador aunque esté en pantalla completa, algo que normalmente ningún overlay logra hacer sobre un juego en modo exclusivo. Si ninguna de las dos aplicaciones está instalada, la otra sigue funcionando exactamente igual, sin depender de la conexión.

## Otras cosas que trae

La aplicación tiene un asistente breve para cuando la abrís por primera vez, que te ayuda a conectar tu primer launcher y elegir un tema visual sin abrumarte con opciones. Se puede navegar toda la biblioteca con teclado o con un control conectado, pensado para usarse desde el sillón igual que cualquier consola. Hay una pantalla de perfil con tus estadísticas generales, y una función de respaldo que exporta tus ajustes reales, tus rutas elegidas a mano y tu progreso de logros a un solo archivo, para poder llevarlos a otra computadora sin depender de ninguna nube.

Nada en MegaHUB se conecta con servicios pagos ni pide tus credenciales de cada launcher. Todo lo que lee, lo lee de lo que ya tenés instalado en tu propia máquina. Y cuando algo requiere una clave, como carátulas de SteamGridDB o el catálogo extendido de TheGamesDB, esa clave es tuya, gratuita, y opcional: sin ella, esas funciones puntuales simplemente no se activan y el resto de la aplicación sigue andando normal.
