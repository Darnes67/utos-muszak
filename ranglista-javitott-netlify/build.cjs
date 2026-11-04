const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const script=html.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/);
if(!script)throw Error('Missing game engine');
const code=script[1].replace(/^import [^\n]*;\s*$/gm,'').replace(/\/\/ ONLINE_CLIENT_BEGIN[\s\S]*?\/\/ ONLINE_CLIENT_END/,'');
// A static CommonJS dependency travels with the function after esbuild bundling.
fs.writeFileSync('server/game-source.cjs','module.exports='+JSON.stringify(code)+';\n');
fs.writeFileSync('server/economy-source.cjs','module.exports='+JSON.stringify(fs.readFileSync('economy.js','utf8'))+';\n');
fs.mkdirSync('dist',{recursive:true});
for(const file of ['index.html','auth.js','legacy-login.js','economy.js','ads.js','webtar-account.js','casino-core.js','frontwars.html','frontwars.css','frontwars.js','site-stats.js'])fs.copyFileSync(file,'dist/'+file);
// Preserve index.html as the original game source used by server verification.
fs.copyFileSync('index.html','dist/utosmuszak.html');
fs.copyFileSync('portal.html','dist/index.html');
for(const dir of ['games','assets'])fs.cpSync(dir,'dist/'+dir,{recursive:true});
console.log('Webtar, games, auth and bundled verification engine built.');

function addPresence(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const path=dir+'/'+entry.name;if(entry.isDirectory())addPresence(path);else if(entry.name.endsWith('.html')){const h=fs.readFileSync(path,'utf8');fs.writeFileSync(path,h.replace('</body>','<script src="/site-stats.js" defer></script></body>'));}}}addPresence('dist');
