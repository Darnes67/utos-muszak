# Ranglista javítás – a feltöltött fájlokra építve

A feltöltött HTML már Netlify Identityvel jelentkeztet be, de a ranglistához `/api/me`, `/api/leaderboard`, `/api/round/start` és `/api/round/finish` kiszolgáló is kell. A kapott három fájlban ezek implementációja és az `/api/*` átirányítás hiányzott. A javítás ezeket pótolja.

## Mit tölts fel?

A ZIP **teljes tartalmát** tedd a Netlifyhoz kapcsolt Git-repozitórium gyökerébe. Ne csak a `dist` mappát vagy a HTML-t töltsd fel Netlify Drop-pal: azzal a kiszolgáló nem készül el.

- `index.html`: a te legutóbb feltöltött játékod, javított ranglistakapcsolattal.
- `auth.js`: a te Netlify Identity modulod, hozzáadott friss tokenlekéréssel.
- `netlify.toml`: a te beállításod, kiegészítve az API átirányításával.
- `package.json`, `build.cjs`: telepítik a Netlify Blobs csomagot, és előállítják a publikálandó `dist` mappát.
- `netlify/functions/ranglista.mjs`, `server/`: az új ranglista-kiszolgáló és a szerveroldali játékmotor.

## Netlify beállítás

1. A meglévő webhelyednél használd a Gitből történő telepítést. A projekt gyökere az a mappa legyen, ahol a `package.json` és `netlify.toml` található.
2. Build command: `npm run build`. Publish directory: `dist`. Functions directory: `netlify/functions`. A mellékelt TOML ezeket megadja.
3. A meglévő webhelyen maradjon engedélyezve a **Netlify Identity**. A korábbi bejelentkezések és e-mailes fiókok ehhez tartoznak.
4. Indíts új deployt. A Functions listában jelenjen meg a **ranglista** függvény.
5. Nyisd meg: `https://SAJAT-OLDALAD.netlify.app/api/leaderboard?kind=sprint&period=all`. JSON-választ kell látnod. Új ranglistán a `rows` mező üres tömb. Ha 404 vagy HTML érkezik, a függvény vagy az átirányítás nem került telepítésre.
6. Jelentkezz be a játékban, indíts egy teljes 45 másodperces **Versenykört** a felső gombbal, majd ellenőrizd a „Ranglistára mentve” feliratot és a ranglistát.

Nem kell Supabase-projekt vagy saját adatbáziskulcs ehhez a csomaghoz. A szerver a webhelyhez tartozó **Netlify Blobs** tárolót használja. Ez nem a böngésző helyi mentése: a játékosok eredményei közösek. A tároló site-szintű, nem vész el új deploykor. A Blobs hozzáférése a Functions környezetben automatikus; a szolgáltatás használata a Netlify-csomagod feltételeitől függ.

## Hogyan működik?

A fiókot a szerver a Netlify Identity szolgáltatásánál ellenőrzi. A HTML minden hitelesített kérés előtt friss hozzáférési tokent kér. A kör eredményét az egérmozdulatokból a szerver számolja újra. Saját pontszám beküldésével nem lehet felkerülni a ranglistára.

Külön heti/összesített lista tartozik a Pontversenyhez és Kombókupához; a Napi kihívás naponta vált UTC szerint. Játékosonként a legjobb kör jelenik meg. A sima Szabad játék/Pontvadászat helyi rekordja nem kerül automatikusan a közös ranglistára.

A pontok és az XP párhuzamos beküldéskor sem duplázódnak. Ha a profil mentése után a ranglista írása megszakad, a beküldés újrapróbálása befejezi a mentést. Foglalt játékosnévnél egyedi utótag készül. Az e-mail-cím nem szerepel a nyilvános listán.

Ez új ranglista-tárolót hoz létre. A korábbi helyi mentéseket és a Netlify Identity fiókokat megtartja; egy korábbi, más kiszolgálón tárolt ranglista eredményeit nem tudja a három feltöltött fájlból visszaállítani.

## Ellenőrzés

Node.js 22 vagy újabb verzióval: `npm test`. A teszt memóriában szimulálja a tárolót és a fiókszolgáltatást, egy teljes egérnaplót pedig az igazi játékmotorral számol újra. Éles Identity/Blobs és böngészős ellenőrzéshez a saját Netlify-webhelyed telepítése szükséges.

Ha továbbra is hibázik, küldd el az `/api/leaderboard` válaszát vagy a Netlify **ranglista** függvényének hibaüzenetét. Jelszót és tokent ne küldj.

Hivatalos dokumentáció: https://docs.netlify.com/build/data-and-storage/netlify-blobs/ és https://docs.netlify.com/manage/security/secure-access-to-sites/identity/use-identity-in-functions/
