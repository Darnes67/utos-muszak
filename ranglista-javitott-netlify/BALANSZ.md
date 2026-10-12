# Ütős műszak – csillagbolt

A csillag az egyetlen elkölthető pénznem. Az XP a meglévő rangrendszerhez tartozik, nem vásárlópénz.

## Eszközárak és megszerzési idők

Az idők 40 csillag/perces aktív keresettel számolnak, és egy termék teljes árára vonatkoznak. A találati arány és az eszköz kezelése befolyásolja a tényleges keresetet.

| Eszköz | Ár | Becsült idő |
|---|---:|---:|
| Fa baseballütő | 0 ★ | azonnal |
| Szivacsütő | 150 ★ | 3 perc 45 mp |
| Felfújható banán | 400 ★ | 10 perc |
| Rugós bokszkesztyű | 650 ★ | 16 perc 15 mp |
| Játék kalapács | 900 ★ | 22 perc 30 mp |
| Óriási szivacskéz | 1200 ★ | 30 perc |

Skinek: Mira 300, Béla 350, Kenny 700, Stan 750, Cartman 800, Kyle 850, Homer 1200, SpongyaBob 1500 csillag. Alex ingyenes.

Ruhák: óceánkék 150, rágógumi 180, neon 450, csillagkapitány 900. Minták: csíkos 150, pöttyös 150, képregény 400, arany 800. Effektek: szívek 300, konfetti 350, neonszikrák 700, galaktikus bonk 1400. Minden ár egyetlen közös katalógusból származik: `economy.js`.

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
| Mind a hat eszköz kipróbálása | 15 ★ |
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
