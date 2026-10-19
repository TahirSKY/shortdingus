import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react-swc';
import {fileURLToPath} from 'node:url';
export default defineConfig({
 root: fileURLToPath(new URL('.',import.meta.url)),
 plugins:[react()],
 server:{host:'0.0.0.0',port:8080,allowedHosts:['.e2b.app'],fs:{allow:[fileURLToPath(new URL('../../..',import.meta.url))]}},
});
