MULTIPLAYER — PCSX2 (PS2 network adapter)
================================================
Applies to: PS2.

Basic requirement
-------------------
This ONLY works with games that already had online play on the real PS2
(they used Sony's official Network Adapter). PCSX2 doesn't add online
play to a game that never had it — it emulates the network hardware, it
doesn't invent a new server.

Setting up the network adapter (one time)
-------------------------------------------------
1. In PCSX2: Settings > Network Adapter (DEV9).
2. Choose the mode based on your connection:
   - If you're on WiFi: choose "SOCKETS".
   - If you're on a wired (Ethernet) connection and your network card
     supports "promiscuous mode": choose "PCAP Switched" (better
     compatibility).
   - If "PCAP Switched" doesn't work: use "Bridged" instead.
3. Enable the network adapter (check the box to turn it on).

Setting up the network INSIDE the game
-------------------------------------------
1. Launch the game and look for its "Network Setup" menu (it varies by
   game, but almost all of them have it in the online main menu).
2. These games almost never support DHCP in the emulator — you'll have
   to set a fixed IP by hand. Coordinate with the other players on which
   IP each of you will use so they don't clash.
3. Save the network configuration to the memory card when the game asks
   for it (some titles save it there, not inside PCSX2 itself).

Before playing with friends
----------------------------
- Everyone needs the SAME version of PCSX2 and the SAME BIOS region
  (NTSC-U/PAL/NTSC-J) — if it doesn't match, the connection fails or
  desyncs.
- This is more manual than RetroArch/Dolphin: each PS2 game sets up its
  network differently, so there may be some trial and error the first
  time.

MegaHUB doesn't manage the connection for you — this is configured
INSIDE PCSX2 and the game itself, MegaHUB just leaves the game ready to
open.
