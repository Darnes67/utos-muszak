# Önkéntes reklámért 300 ★

A játék valós Google Ad Manager rewarded web készletet kér a GPT SDK-val. Nincs bemutató-reklám, teszt-videó, várakozási időért járó jóváírás vagy automatikus reklám. Jelenleg a konfiguráció le van tiltva, mert a kiadó saját hirdetési egysége és hozzájárulási rendszere még nincs megadva. A felület ezt „bekötésre vár” szöveggel jelzi, és nem tölt külső reklámot.

## Éles bekötés

1. A kiadó saját Google Ad Manager-fiókjában hozz létre **webes, out-of-page rewarded** reklámegységet ehhez a webhelyhez. A jutalom mennyisége **300**, a típusa pontosan **stars** legyen. A teljes reklámegység útvonala szükséges, hálózati kóddal együtt. Nem AdSense-banner vagy mobilos AdMob-egység kell.
2. Állítsd be a webhelyhez a Google által elfogadott hozzájárulási kezelőt. EGT/UK/Svájc esetén a vonatkozó Google követelmények szerint minősített CMP kell. Google Privacy & messaging használatakor a saját Funding Choices CMP script URL-jét add meg. Ez nyilvános beágyazási URL, nem API-kulcs vagy jelszó.
3. A projekt `ads-config.json` fájljában legyen `"enabled": true`, `"adUnitPath"` a saját teljes útvonal, `"cmpScriptUrl"` pedig a saját `https://fundingchoicesmessages.google.com/i/pub-…?ers=1` URL. A megadott kiadói azonosító 16 számjegyes. Alternatív, már beágyazott minősített TCF CMP esetén a saját beágyazó kódot az oldalba is ténylegesen be kell tenni, és `"externalCmp": true` állítható; a kapcsoló önmagában nem készít CMP-t.
4. Telepíts Gitből Netlifyra. Az `/api/ads/status` válasza `configured: true`, `reward: 300`, `dailyLimit: 3` legyen. A konfigurációt a szerver adja a kliensnek; egy böngészőoldali átírás nem aktiválja a szerveres jutalmat.
5. A szolgáltatói fiókban legyen aktív, erre az egységre célzott, rewarded formátummal kompatibilis kereslet/kampány. Intézd a szolgáltató webhely- és fiókjóváhagyását, a megadott ads.txt és adatvédelmi tájékoztató beállításait. Egy üres egység nem feltétlenül szolgál reklámot. Éles pénztermelő készletet a szolgáltató saját tesztelési előírásai szerint ellenőrizd.

## Szabályok

- Egy sikeres reklám **300 ★**, legfeljebb **3 jutalom / fiók / UTC-nap**, azaz napi 900 ★.
- Két elindított reklám között legalább 2 perc. Legfeljebb 12 előkészítési kérés óránként; csak egy élő reklámjegy fiókonként.
- Csak bejelentkezett fiók kap reklámjutalmat. Vendég csillagokat ez az új funkció nem importál a szerverre.
- Versenykör, aktív helyi kihívás, szerkesztés és visszajátszás közben nem indítható reklám. Az élő fizika és időzítő megáll, majd a korábbi szünetállapot szerint folytatódik.
- A normál játék jutalmai, árak, vásárlások, achievementek és rekordok változatlanok. Reklám nem ad XP-t, játékbeli találatot, achievementet vagy ranglistapontot.
- Korai bezárás, elutasított hozzájárulás, üres készlet, reklámblokkoló és betöltési hiba nem fizet. A vásárlás és a játék ettől tovább működik.
- A szolgáltató `rewardedSlotGranted` SDK eseménye indítja a szerveres igénylést. Az indítás gomb, a videó bezárása és az eltelt idő önmagukban nem fizetnek. Eltérő jutalomkonfigurációt a kliens és a szerver is visszautasít.
- A szerver saját 300-as összeget használ, fiókhoz kötött véletlen jeggyel és tokennel. A tárolói compare-and-swap műveletben egyszerre menti a jegy felhasználását és a csillagot. Párhuzamos igénylés/HTTP újrapróbálás nem ad második jutalmat.
- Elveszett válasznál az SDK által már megadott jutalom kérelme sessionStorage-ban vár; a „jóváírás újrapróbálása” ugyanazt a jegyet küldi be. Sikeres szerverválaszig a felület nem állít jóváírást. A jegy 10 percig használható; lejárt függő kérelmet az újrapróbálás töröl.

## A webes ellenőrzés határa

**Google GPT rewarded webhez jelenleg nincs szerver–szerver SSV.** A `rewardedSlotGranted` böngészőesemény nem kriptográfiai bizonyíték arra, hogy valaki valóban megnézett egy hirdetést. A szerver ellenőrzi a fiókot, jegyet, jutalomtípust, lejáratot, minimumidőt, egyszeri beváltást és napi limitet; ezek korlátozzák a visszaélést, de egy saját böngészőt manipuláló bejelentkezett felhasználó eseményhamisítását nem zárják ki. A ranglista meglévő szerveroldali fizikai ellenőrzése ettől független. Erős hirdetés-megtekintési bizonyítékhoz webes, aláírt szerveres postbackot biztosító másik szolgáltató és annak tényleges fiókbeállítása szükséges.

## Ellenőrzés

`npm test`: meglévő teljes játék-, bolt-, ranglista- és keresettesztek, valamint az új reklám szerver-, GPT adapter- és frontend/backend integrációs tesztek. Ezek szolgáltatói eseményeket szimulálnak a tesztben; az éles játék nem használ szimulált reklámot. Valós hirdetési megtekintés és Google fiókos bevétel csak a saját reklámegység és CMP bekötése után tesztelhető.

Hivatalos dokumentáció:
- https://developers.google.com/publisher-tag/samples/display-rewarded-ad
- https://developers.google.com/publisher-tag/reference
- https://support.google.com/admanager/answer/9116812?hl=en
- https://support.google.com/admanager/answer/13554116?hl=en
