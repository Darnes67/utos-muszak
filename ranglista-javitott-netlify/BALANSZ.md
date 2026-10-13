# Ütős műszak – csillagbolt

A csillag az egyetlen elkölthető pénznem. Az XP a meglévő rangrendszerhez tartozik, nem vásárlópénz.

## Eszközárak és megszerzési idők

Az idők 40 csillag/perces aktív keresettel számolnak, és egy termék teljes árára vonatkoznak. A találati arány és az eszköz kezelése befolyásolja a tényleges keresetet.

| Eszköz | Ár | Becsült idő (40 ★/perc) |
|---|---:|---:|
| Fa baseballütő | 0 ★ | azonnal |
| Szivacsütő | 140 ★ | 3 perc 30 mp |
| Játék kalapács | 855 ★ | 21 perc 23 mp |
| Felfújható banán | 380 ★ | 9 perc 30 mp |
| Rugós bokszkesztyű | 620 ★ | 15 perc 30 mp |
| Óriási szivacskéz | 1140 ★ | 28 perc 30 mp |
| Gumicsirke | 250 ★ | 6 perc 15 mp |
| Serpenyő | 550 ★ | 13 perc 45 mp |
| Seprű | 350 ★ | 8 perc 45 mp |
| Óriási villáskulcs | 800 ★ | 20 perc 0 mp |
| WC-pumpa | 450 ★ | 11 perc 15 mp |
| Rocksztár gitár | 1000 ★ | 25 perc 0 mp |
| Pisztoly | 1800 ★ | 45 perc 0 mp |
| Sörétes puska | 2400 ★ | 60 perc 0 mp |
| Gépfegyver | 3200 ★ | 80 perc 0 mp |

Skinek: Alex 0 ★, Mira 285 ★, Béla 330 ★, Cartman 760 ★, Kenny 665 ★, Stan 710 ★, Kyle 810 ★, Homer 1140 ★, SpongyaBob 1425 ★, Peter Griffin 800 ★, Lois Griffin 700 ★, Stewie Griffin 850 ★, Brian Griffin 800 ★, Meg Griffin 600 ★, Chris Griffin 650 ★, Glenn Quagmire 850 ★, Cleveland Brown 700 ★, Csillag Patrik 950 ★, Tunyacsáp 900 ★, Rák úr 1100 ★, Szandi 1050 ★, Bart Simpson 750 ★, Lisa Simpson 800 ★, Marge Simpson 950 ★, Rick Sanchez 1200 ★, Morty Smith 750 ★, Finn 850 ★, Jake 900 ★, Shrek 1300 ★.

Ruhák: Óceánkék ruha 140 ★, Rágógumi ruha 170 ★, Neon műszak 430 ★, Csillagkapitány 855 ★. Minták: Csíkos eszköz 140 ★, Pöttyös eszköz 140 ★, Képregénynyomat 380 ★, Arany műszak 760 ★. Effektek: Szívecskék 285 ★, Konfettieső 330 ★, Neonszikrák 665 ★, Galaktikus bonk 1330 ★. Az árak egyetlen közös katalógusból származnak: `economy.js`.

## Mérés és jutalmak

Azonos, 45 másodperces egérnaplóval a korábbi rendszerben eszközönként 285–841 csillag keletkezett, a trófeák pluszjutalma nélkül. Az új rendszer ugyanazzal a naplóval 20–33 csillagot ad. Az alapütő 33 csillagot, azaz 44 csillag/percet ért el. A kisebb találati arányú szivacsütős napló 27 csillag/perces keresetet adott; gyengébb játék esetén a célértéknél kevesebb jutalom természetes.

A jutalomkeret csak aktív szimuláció közben töltődik, 0,75 csillag/másodperces alapsebességgel. A kombó lépcsőnként 0,02-vel növeli ezt, legfeljebb 0,83-ig. A keret legfeljebb egy csillagot tárol; önmagában nem fizet ki semmit. Figuratalálat legfeljebb egy, tárgytalálat legfeljebb 0,35 csillagnyi keretet használ fel. A törtrészek összegyűlnek. Ugyanaz a tárgy tíz másodpercen belül nem ad újabb jutalmat. Egy új lendítés egy találatot ér.

A pontszám, erő, pálya, a bója eldőlése, a feladat teljesítése, a figurabehívás, a felállítás, szerkesztés, visszajátszás és újraindítás nem ad külön csillagot. Az achievementek egyszeri, szerveroldali naplóval védett bónuszt adnak; nincs ismételhető pénzjutalmuk. Szünetben nem töltődik a keret.

Vendégként a helyi játék jutalmaz, a mentés a böngészőben marad. Bejelentkezve a normál szabad játék, pontvadászat és feladatkihívás is automatikusan csillagot ad. A böngésző a valódi egér- és vezérlési bemeneteket három aktív másodpercenként küldi el. A szerver saját korábbi fizikai állapotából újrajátssza a szakaszt; nem fogad el beküldött csillagértéket, találatszámot vagy achievementet. A jóváírás és az új fizikai állapot egyetlen CAS művelet, sorszámos újrapróbálással. Az aktív idő nem előzheti meg a valós időt. Új munkamenet sem nullázza a jutalomkeretet. Szünet, szerkesztés és visszajátszás alatt nem gyűlik csillag.

A versenyköröket továbbra is a szerver ellenőrzi; a normál gyűjtés előbb mentődik és lezárul. A 45 másodperces versenykör alapjutalma legfeljebb 38 ★. Az új achievementek ezen felül, egyszer járnak.

### Egyszeri achievement-jutalmak

| Eredmény | Bónusz |
|---|---:|
| Első találat | 5 ★ |
| Ötös kombó | 10 ★ |
| Ötven összesített találat | 20 ★ |
| Hat különböző eszköz kipróbálása | 15 ★ |
| Mindhárom pálya | 10 ★ |
| Három bója feldöntése | 10 ★ |
| Mind a hat feladat teljesítése | 25 ★ |
| Új kihívásrekord | 20 ★ |

Összesen 115 ★, egyszer, fiókonként. Újratöltés, újraindítás, ismételt ellenőrzés és párhuzamos kérések sem adják újra. A korábbi szerveren hitelesített körökből az értelmesen igazolható eredmények visszakerülnek. Ellenőrizetlen helyi jelvény nem fizethet fiókos pénzt. Vendégként a már régen jutalmazott badge-eket fizetettnek tekintjük; az előző csillagbolt-verzióban csak jelvényként kiosztott eredményekhez egy egyszeri pótlás jár.

A figurabehívás, felállítás és tárgyvisszaállítás nem ad találati csillagot. A pályák/eszközök kipróbálásáért az egyszer teljesíthető achievement bónusza járhat.

## Mentés, migráció, vásárlás

A bejelentkezett fiók pénze, tulajdonai és felszerelése egy szerveres profilban vannak. A termék árát a szerver választja ki. A csillaglevonás és feloldás CAS művelettel történik; az azonos tranzakció ismétlése nem von le újra. Hálózati hiba után a böngésző ugyanazzal az azonosítóval próbálkozik. Aktív körben a bolt nem módosíthatja a felszerelést.

A régi helyi csillagok megmaradnak a vendégmentésben. Az ellenőrizetlen helyi egyenleg nem írhatja felül a szerverét. A hat régi helyi kozmetikum egyszer átvihető a fiókba; a migráció nem fogad el pénzt, új eszközt vagy új skint. A már szerveren tárolt vásárlások és a játék beállításai megmaradnak. Nem birtokolt, régen ingyenesen kiválasztott figura vagy eszköz helyett betöltéskor az alapfelszerelés kerül elő.

A versenyek a szerver által kijelölt felszerelést kölcsönadják a körre. A kölcsön nem jelent bolti feloldást. A kozmetikumok nem adnak pontszorzót vagy csillagbónuszt.

## Ellenőrzések

`npm test`: szerveroldali egérnapló-ellenőrzés, ranglista, egyszeri körjutalom, három versenytípus, 10 802 eseményes gyors lendítés; 27 termék vásárlása és felszerelése; manipulált ár és egyenleg elutasítása; párhuzamos és ismételt vásárlás; elégtelen pénz; zárolt felszerelés; versenybeli kölcsön; kör megszakítása; régi kozmetikumok; tartós és hibás mentés; hálózati hiba és tranzakcióazonosítós újrapróbálás; minden előnézet és nyolc bokszkesztyűszög; az előnézet visszaállítja az élő állapotot; egy RAF-ciklus; 40–50 csillag/perces aktív jutalomkorlát. A tároló és fiókszolgáltatás az automatizált integrációs tesztekben helyettesített; a fizika a valódi játék motorja.

Új tesztek: normál játék szerveres szakaszellenőrzése, tényleges UI/egéresemények és szerverállapot teljes egyezése, nyomott gombbal lendítés, automatikus felállás, kéz, szerkesztő, beállítások, hálózati/tárolási hiba és újrapróbálás, egyszeri achievement-jutalmak, migráció és versenyköröktől elkülönítés.

## Rajzfilm- és fegyverfrissítés

A korábbi fizetős termékek ára körülbelül 5%-kal csökkent, öt csillagra kerekítve. A régi ID-k, vásárlások, egyenlegek és kozmetikumok megmaradnak. A kínálat 29 figurát és 15 eszközt tartalmaz. Az új figurák személyes, humoros buborékokat is kaptak.

A lőfegyverek külön, legfeljebb 24 elemes lövedéklistát használnak. Nyomva tartott bal egérgombbal tüzelnek. A fegyver felvétele nem lövés: további lenyomás vagy szándékos egérmozgatás kell. A fegyver a kurzor felé fordul; a lövedék a látható csőből, annak tényleges irányában indul. A bejárt út legfeljebb 2 pixeles lépésekre bontva vizsgált. Minden lövedék legfeljebb egy találatot ad; a véget ért, eltévedt lövedék mellélövés. A szünet, visszajátszás és szerkesztés alatt a lövedékfizika is áll. Felszerelésváltás és újrakezdés törli a régi lövedékeket.

A lövedék repülési sebessége és átadott lökése külön adat. Mindhárom fegyver teljesítheti a közepes erőt kérő feladatot. A gépfegyver gyorsabb, de kis lökésű; a sörétes erősebb, lassan fordul és ritkábban tüzel. A jutalomkeret változatlan: a több lövedék nem ad több csillagot a keretnél. A hivatalos ranglista összeállításai maradnak a korábbi eszközöknél és figuráknál; megvett fegyver nem ad ranglistaelőnyt.

Ellenőrzés: `npm test`, beleértve az új `tests/expansion.cjs` tesztet. Az összes új eszköz mindhárom pályán ugyanazt az állapotot adja a valódi UI-eseményekből és a szerver újrajátszásában. Lefedett: gyors lövedék, egy lövedék/egy találat, folyamatos tüzelés, felvétel jutalom nélkül, szünet/elengedés/újrakezdés, visszajátszás állapotmegőrzése, 15 eszköz 8 forgási szögben a képernyő szélein, 20 új figura fizikája, régi fizikai snapshotok és vásárlások betöltése.
