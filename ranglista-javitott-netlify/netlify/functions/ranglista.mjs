import { admin } from '@netlify/identity';
import { getStore } from '@netlify/blobs';
import api from '../../server/api.cjs';
import storage from '../../server/store.cjs';
export default async request => {
  try {
    const store = new storage.ScoreStore(getStore({ name: 'utos-muszak-ranglista-v1', consistency: 'strong' }));
    return await api.createAPI({ store, createIdentityUser: params => admin.createUser(params), updateIdentityUser: (id,attrs) => admin.updateUser(id,attrs), listIdentityUsers: options => admin.listUsers(options) })(request);
  } catch (_) {
    return new Response(JSON.stringify({error:'A Netlify Blobs tároló nem érhető el. A teljes projektet Functions-szel együtt telepítsd.'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  }
};
