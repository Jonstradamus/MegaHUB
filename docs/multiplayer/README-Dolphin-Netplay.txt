MULTIPLAYER — Dolphin Netplay
==============================
Applies to: GameCube and Wii.

Golden rule
------------------
Every player needs:
  1. The SAME version of Dolphin (check "Help > About" if unsure).
  2. The SAME game ISO/ROM — same file, same hash.
If it doesn't match, Dolphin either rejects the connection outright or
desyncs within a few minutes.

How to host a match
------------------------------
1. Open Dolphin, select the game (no need to open it yet).
2. Tools > Start NetPlay Session.
3. Choose "Host". Dolphin uses a public traversal server by default —
   you don't need to open ports on your router for most cases.
4. Share the room code Dolphin shows you with your friends (or your IP
   if you chose direct connection instead of traversal).

How to join a match
---------------------------
1. Tools > Start NetPlay Session > "Join".
2. Enter the room code or the IP the host gave you.
3. Dolphin will warn you if your copy of the game doesn't match the
   host's (different hash) — in that case you'll need to get the same
   version/region of the game before you can play together.

Extra recommendations
------------------------
- Before starting netplay, turn off "Save States" — using them in the
  middle of a networked match breaks sync between all players.
- If you're using any Gecko/AR codes (cheats), enable "Sync Codes" in
  the NetPlay window so everyone plays with the same ones.

MegaHUB doesn't manage the connection for you — this is configured
INSIDE Dolphin, MegaHUB just leaves the game ready to open.
