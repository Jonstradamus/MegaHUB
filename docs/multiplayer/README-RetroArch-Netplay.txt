MULTIPLAYER — RetroArch Netplay
================================
Applies to: NES, SNES, Genesis/Mega Drive, Game Boy/Color/Advance, PS1,
N64, Dreamcast/NAOMI, PSP, NDS, 3DS, Arcade/NeoGeo, PC Engine, Atari
(2600/5200/7800/Lynx/Jaguar), Intellivision, ColecoVision, Vectrex, MSX,
3DO, Virtual Boy, Neo Geo Pocket, WonderSwan — any console in this list
that MegaHUB runs through a RetroArch core.

Golden rule (read this first)
----------------------------------------
Every player needs:
  1. The SAME version of RetroArch.
  2. The SAME core (and the same core version).
  3. The SAME ROM — literally the same file (same hash/checksum).
If any of this doesn't match, the game will desync (everyone sees
something different) sooner or later. This isn't a RetroArch bug: that's
how input-sync-based netplay works, not video sync.

How to host a match
------------------------------
1. Open RetroArch and load the game normally (or from MegaHUB).
2. Main Menu > Netplay > "Enable Netplay Host".
3. Default port: 55435 (TCP and UDP). If your friend can't connect:
   - If you're playing on the same local network (home LAN/WiFi): nothing
     else needed, just share your local IP (192.168.x.x).
   - If you're playing over the internet: you'll need to open that port
     on your router (port forward to your PC) and share your PUBLIC IP
     (search "what is my ip" on Google). An alternative that doesn't
     require touching the router: turn on "Announce on Netplay public
     lobbies" so it shows up in the built-in browser (Netplay > Find
     Rooms), but that makes your match visible to anyone, not just your
     friends.

How to join a match
---------------------------
1. Open RetroArch, Netplay > "Connect to Netplay Host".
2. Enter the IP the host gave you (and the port, if they changed it).
3. Make sure you have the SAME game loaded (same file) before connecting
   — RetroArch warns you if the hash doesn't match, but it's better to
   confirm it beforehand instead of wasting time.

How well it works depending on the game
---------------------------------------
- 2D games (NES/SNES/Genesis/PS1 2D/Game Boy/etc.): excellent, this is
  what Netplay supports best.
- Heavy 3D games (N64, Dreamcast): can have more lag or desync more
  often, especially if either player has a poor connection. Try it with
  a good connection first before ruling it out.

MegaHUB doesn't manage the connection for you — this is configured
INSIDE RetroArch, MegaHUB just leaves the game ready to open.
