const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const script=html.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/);
if(!script)throw Error('Missing game engine');
const code=script[1].replace(/^import [^\n]*;\s*$/gm,'').replace(/\/\/ ONLINE_CLIENT_BEGIN[\s\S]*?\/\/ ONLINE_CLIENT_END/,'');
// A static CommonJS dependency travels with the function after esbuild bundling.
fs.writeFileSync('server/game-source.cjs','module.exports='+JSON.stringify(code)+';\n');
fs.mkdirSync('dist',{recursive:true});
for(const file of ['index.html','auth.js','economy.js'])fs.copyFileSync(file,'dist/'+file);
console.log('HTML, auth and bundled verification engine built.');
