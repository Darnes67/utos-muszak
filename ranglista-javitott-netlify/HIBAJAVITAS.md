# Ütős műszak – stabilitási javítás, 2026-10-13

## Megtalált hibák és javításuk

- A csillagmunkamenet indításának késői válasza újraindította a jelenetet: a felhasználó közben behívott figurája, módja és fizikai állapota elveszett. Az indulás most a kérés előtt, egyszer történik; a késői válasz csak a szerverazonosítót és egyenleget frissíti. A játék közben használható, a közben érkező vezérlés naplózva marad.
- Rendszeres profilfrissítés vagy régi kör eredménye visszaállíthatta az alapfelszerelést. A pénzfrissítés most nem cserél figurát/eszközt. A monoton szerveres pénztárcaverzió kizárja az elavult válaszok visszaírását.
- A beküldés a teljes ranglistabetöltésig az onlineBusy jelzővel blokkolta az újrapróbálást. A beküldés külön háttérállapotot és megőrzött sort kapott; a ranglista frissítése nem blokkolja az új játékot. A korábbi kör az új kör indítása után is menthető, és nem írja felül az új eredményképernyőt.
- Szerkesztés/visszajátszás letiltotta az általános újraindítást. Az Újrakezdés és a módváltás most mindkét állapotból működik, megfogás/pointer capture nélkül folytatódik.
- A szabad játék újrakezdése minden alkalommal eltávolította a figurát. Ha már volt figura, újra behívódik; az Újra játszom gomb új kört és figurát készít elő.
- Rajzolási kivétel után elmaradt a következő requestAnimationFrame. Most a ciklus finally ágban ütemez, hiba esetén szünetel, az újraindítás továbbra is működik. Nem indul második ciklus.
- A négy első tárgy azonos azonosítót kapott: összekeveredett a külön tárgyak kezelése és a jutalomkorlát. Minden tárgy saját azonosítót kap.
- Nulla méretű Canvas mutatókoordinátája NaN lehetett; ellenőrzött visszatérési pontot kapott. A pointer capture elengedése a szinkron capture-loss esemény mellett sem rekurzív.
- Sikertelen kezdeti fiókleérés örök loading állapotot hagyott. A helyi játék és bolt működő vendégállapotba tér vissza, a fiókadatot nem írja felül vendégpénzzel.
- A csillagmentés naplókorlátja a játékot is megállította. Most a mentést függeszti fel; a helyi játék használható marad, és a megőrzött napló újrapróbálható.

## Gyorsabb ellenőrzés

A szerver azonos fizikai motort és pontos bemenetellenőrzést használ. Nem rajzol/nem generál vizuális effekteket, a csillagekonomia a saját VM-ben fut, a sokszor újraszámolt forgatott tárgygeometria érvényességellenőrzött gyorsítótárat kapott. Távoli ütközésekhez konzervatív határolóvizsgálat használható a részletes számítás előtt. A teljes egérnapló egyszer már ellenőrzött eredménye legfeljebb nyolc elemes gyorsítótárból ismételhető; ticket, időkorlát, profil és egyszeri jóváírás továbbra is ellenőrzött.

Ugyanazzal a 45 másodperces referencianaplóval a mért helyi első ellenőrzés kb. 914 ms-ról 360 ms-ra csökkent. A pontok (99880), találatok (102), tárgytalálatok (30), próbálkozások (133), kombó (5) és csillagok (33) változatlanok. Ez számítási idő, nem ígéret a Netlify hálózati/fiókleérési válaszidejére.

## Mentések és jutalmazás

A korábbi vásárlások, csillagok, achievementek és rekordok megmaradnak. A munkamenet indulásának hálózati késéséhez korlátozott időtűrés tartozik; az összesített szerveres jutalomkeret valós időben legfeljebb 0,83 csillag/másodperccel töltődik, ezért az új munkamenetekkel nem gyorsítható a csillagtermelés. Az achievement-bónuszok továbbra is egyszeriek.

## Ellenőrzés

`npm test`: eredeti ranglista-, bolt-, fizika- és csillagmentési ellenőrzések; mind a 18 pálya/eszköz kombináció; új regressziós tesztek késleltetett munkamenetindítással, közbeni reset/módváltással, késleltetett eredménnyel, új körrel és kölcsönfelszereléssel; szerkesztő/visszajátszás újrakezdése; szándékos renderhiba és egy RAF; pointer capture; nulla Canvas-méret; egyedi tárgyazonosítók; elavult pénztárcaválasz; offline indulás. A szerverfizika valós; Identity és Blobs a tesztekben helyettesített.
