'use strict';
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
class ScoreStore{
  constructor(blobs){this.blobs=blobs;}
  get(key){return this.blobs.get(key,{type:'json',consistency:'strong'});}
  async mutate(key,fallback,change){
    for(let i=0;i<12;i++){
      const current=await this.blobs.getWithMetadata(key,{type:'json',consistency:'strong'});
      const data=structuredClone(current?.data??fallback),result=change(data);
      const options=current?{onlyIfMatch:current.etag}:{onlyIfNew:true};
      const saved=await this.blobs.setJSON(key,data,options);
      if(saved.modified)return result;
    }
    throw new HttpError(503,'A ranglista most foglalt. Próbáld újra a Frissítés vagy Beküldés gombbal.');
  }
}
const profileKey=id=>'profile/'+id;
module.exports={HttpError,ScoreStore,profileKey};
