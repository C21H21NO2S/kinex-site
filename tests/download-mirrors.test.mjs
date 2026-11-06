import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../download/index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../public/download.js',import.meta.url),'utf8');
const baidu='https://pan.baidu.com/s/1f8e1llzsdWdysfVNkYYW8g?pwd=1234';
const lanzou='https://wwaxj.lanzouu.com/b0ummnqod';
const sharedLinks=html.split('<a ').slice(1).map(part=>part.split('>')[0]).filter(tag=>tag.includes('data-download-mirror')).map(tag=>({href:tag.split('href="')[1].split('"')[0]}));
const render=async mirror=>{
 const box={innerHTML:''};
 const document={documentElement:{dataset:{lang:'zh'}},getElementById:()=>box,querySelector:()=>sharedLinks[0],querySelectorAll:()=>sharedLinks};
 const release={version:'0.1.0-beta.4',releasedAt:1,downloads:{windows:{url:'https://example.test/installer.exe',size:1024,sha256:'hash'},mirror}};
 runInNewContext(script,{document,location:{hostname:'kinexnote.com'},fetch:async()=>({ok:true,json:async()=>({releases:[release]})}),MutationObserver:class{observe(){}}});
 await new Promise(setImmediate);
 return box.innerHTML;
};

test('Baidu is configured once in the global mirror area with its extraction code',()=>{
 assert.equal(sharedLinks.filter(link=>link.href===baidu).length,1);
 const area=html.split('aria-labelledby="baidu-mirror-title"')[1]?.split('</section>')[0];
 assert.ok(area?.includes('<code>1234</code>'));
 assert.ok(area?.includes('data-en="Download from Baidu Netdisk"'));
 assert.ok(area?.includes('rel="noopener noreferrer"'));
});

test('release cards do not duplicate either globally configured mirror',async()=>{
 for(const mirror of [lanzou,baidu])assert.ok(!(await render(mirror)).includes('国内备用'),mirror);
});

test('a separate legacy release mirror remains available',async()=>{
 assert.ok((await render('https://example.test/legacy-mirror')).includes('href="https://example.test/legacy-mirror"'));
});
