# Ütős műszak – csillagbolt

A csillag az egyetlen elkölthető pénznem. Az XP a meglévő rangrendszerhez tartozik, nem vásárlópénz.

## Eszközárak és megszerzési idők

Az idők 40 csillag/perces aktív keresettel számolnak, és egy termék teljes árára vonatkoznak. A találati arány és az eszköz kezelése befolyásolja a tényleges keresetet.

| Eszköz | Ár | Becsült idő (40 ★/perc) |
|---|---:|---:|
| Fa baseballütő | 0 ★ | azonnal |
| Szivacsütő | 130 ★ | 3 perc 15 mp |
| Játék kalapács | 790 ★ | 19 perc 45 mp |
| Felfújható banán | 350 ★ | 8 perc 45 mp |
| Rugós bokszkesztyű | 570 ★ | 14 perc 15 mp |
| Óriási szivacskéz | 1050 ★ | 26 perc 15 mp |
| Gumicsirke | 230 ★ | 5 perc 45 mp |
| Serpenyő | 510 ★ | 12 perc 45 mp |
| Seprű | 320 ★ | 8 perc 0 mp |
| Óriási villáskulcs | 740 ★ | 18 perc 30 mp |
| WC-pumpa | 415 ★ | 10 perc 23 mp |
| Rocksztár gitár | 920 ★ | 23 perc 0 mp |
| Pisztoly | 1660 ★ | 41 perc 30 mp |
| Sörétes puska | 2210 ★ | 55 perc 15 mp |
| Gépfegyver | 2940 ★ | 73 perc 30 mp |

Skinek: Alex 0 ★, Mira 260 ★, Béla 305 ★, Cartman 700 ★, Kenny 610 ★, Stan 650 ★, Kyle 750 ★, Homer 1050 ★, SpongyaBob 1310 ★, Peter Griffin 740 ★, Lois Griffin 640 ★, Stewie Griffin 780 ★, Brian Griffin 740 ★, Meg Griffin 550 ★, Chris Griffin 600 ★, Glenn Quagmire 780 ★, Cleveland Brown 640 ★, Csillag Patrik 870 ★, Tunyacsáp 830 ★, Rák úr 1010 ★, Szandi 970 ★, Bart Simpson 690 ★, Lisa Simpson 740 ★, Marge Simpson 870 ★, Rick Sanchez 1100 ★, Morty Smith 690 ★, Finn 780 ★, Jake 830 ★, Shrek 1200 ★.

Ruhák: Óceánkék ruha 130 ★, Rágógumi ruha 155 ★, Neon műszak 395 ★, Csillagkapitány 790 ★. Minták: Csíkos eszköz 130 ★, Pöttyös eszköz 130 ★, Képregénynyomat 350 ★, Arany műszak 700 ★. Effektek: Szívecskék 260 ★, Konfettieső 305 ★, Neonszikrák 610 ★, Galaktikus bonk 1220 ★. A közös, szerveroldalon is használt árlista az `economy.js`.

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

## Részletes megjelenés – polish-5

Minden fizetős termék további körülbelül 8%-kal olcsóbb. 500 csillag alatt az ár 5-re, fölötte 10-re kerekített. Megmaradt az összes termékazonosító és vásárlás. A csillagkereset és a hivatalos versenyfizika/pontozás változatlan.

A figurák testén és végtagjain anyagárnyékolás, szabottabb körvonal, ruharedők, zsebek, gallérok, varrások és cipőrészletek láthatók. A karakterek személyes díszei (Patrik nadrágvirágai, Peter öve/ingzsebe, Szandi vezérlőpanelje, Rick köpenye stb.) részletesebbek. Az arcok pupillafényt, szemhéjat, egyedi szemarányt, szemöldököt, szédült spirált, meglepett szájat és rövid izzadtságcseppet kaptak. A testrészek és ütközési geometriák változatlanok.

Találatkor eszközfüggő, irányított impulzusgyűrű jelenik meg; a lövések saját procedurális, rétegzett Web Audio-hangot, rövid füstöt és kihulló hüvelyeket kapnak. A Beállítások „Rajzfilmes vérhatás” kapcsolója opcionális piros cseppeket ad; alapállapotban kikapcsolt, a választás helyben mentődik. A padlófoltok 5 másodperc alatt eltűnnek. Nincs részletes seb vagy csonkolás.

Az új effektek kizárólag rajzolási állapotok: nem adnak pontot/csillagot és nem változtatják meg az ízületeket. Korlátok: 20 impulzus, 64 csepp, 24 folt, 20 füst és 24 hüvely. A csökkentett effektek eltüntetik a füstöt/hüvelyeket és az impulzusgyűrűt, a vércseppek számát kettőre korlátozzák. Szünetben az effektidő is áll. Visszajátszás a tárolt rajzolási állapotot mutatja, majd ugyanazt az élő állapotot állítja vissza. Újrakezdés/módváltás/pályaváltás törli az effekteket. A szerver nem futtatja a kizárólag látványt szolgáló effektszimulációt.

Ellenőrzések: teljes `npm test`, korábbi golden versenyeredmény és szerver/UI állapotegyezés, `tests/polish.cjs` a vérkapcsoló mentésére, régi mentések alapállapotára, egyszeri jutalmak/árak megőrzésére, effektkorlátokra, foltok eltűnésére, replay/újrakezdés/csökkentett effektek viselkedésére, valamint mind a 29 figura arcreakcióinak véges Canvas-koordinátáira.

Az élő böngészős próba után a képregényfeliratok helye a testrészek és az ütés körüli terület alapján választott: nem fedik a fejet. A szövegbuborék a feliratot elkerülő függőleges helyet választ. A vércseppek az alapcsillag-részecskék után rajzolódnak, hogy látszódjanak; a „Pálya rendberakása” az ideiglenes foltokat és effekteket is eltünteti. Az összes figurára ellenőrzött a kezdeti felirat/fej átfedés hiánya.
