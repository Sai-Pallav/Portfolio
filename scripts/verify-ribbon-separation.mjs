// Run with node scripts/verify-ribbon-separation.mjs. Set CHROME_PATH on non-Windows hosts.
// Exercises the production GLSL with real baked attributes via WebGL2 transform feedback.
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import * as THREE from 'three'
import { TRAVEL_DEFORMATION_GLSL } from '../src/components/sections/contact/neuralWire/animationContract.js'
import { computeHeroWaveY, computeHeroWaveZ, addTravelFlowAttributes, env, H_VAL } from '../src/components/sections/contact/neuralWire/generateWireGeometry.js'

const source = readFileSync(new URL('../src/components/sections/contact/neuralWire/WireframeConfigContext.jsx', import.meta.url),'utf8')
const config = runInNewContext(`(${source.match(/export const DEFAULT_SIDE_CONFIG = (\{[\s\S]*?\n\})/)[1]})`)
const positions=[], us=[], ids=[]
for(let sample=0; sample<=120; sample++) {
  const u=sample/120
  for(let owner=0;owner<4;owner++) {
    const radius=.16*env(u,H_VAL)*config.strandSpread*config.stringWidth
    const depth=.08*env(u,H_VAL)*config.stringWidth
    for(const [dy,dz] of [[0,0],[radius,depth],[radius,-depth],[-radius,depth],[-radius,-depth]]) {
      positions.push(10*u, computeHeroWaveY(owner,u,H_VAL,config)+dy, computeHeroWaveZ(owner,u,H_VAL,config)+dz);us.push(u);ids.push(owner)
    }
  }
}
const geometry=new THREE.BufferGeometry()
geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
geometry.setAttribute('aU',new THREE.Float32BufferAttribute(us,1))
geometry.setAttribute('aWireId',new THREE.Float32BufferAttribute(ids,1))
addTravelFlowAttributes(geometry,H_VAL,config)
const attributes=Object.fromEntries(Object.entries(geometry.attributes).map(([name,a])=>[name,{size:a.itemSize,data:[...a.array]}]))
const matrices=[]
for(const width of [1920,1024,390]) {
  const height=width>=1200?808:width>=768?636:492
  const camera=new THREE.PerspectiveCamera(45,width/height,.1,100)
  camera.position.z=8;camera.updateMatrixWorld()
  const vw=2*8*Math.tan(Math.PI/8)*width/height
  const baseStart=vw>=8.5?2.3:vw<=5.5?1.65:1.65+(vw-5.5)/3*.65
  const xInner=baseStart-1.3+.7
  const span=Math.max(vw/2*1.28,7.2)-2.4-xInner
  for(const side of [-1,1]) {
    const model=new THREE.Matrix4().compose(new THREE.Vector3(side*xInner,0,.2),new THREE.Quaternion().setFromEuler(new THREE.Euler(2*Math.PI/180,-side*16*Math.PI/180,0)),new THREE.Vector3(span/10,Math.max(.6,Math.min(1.35,span*.18))*1.35,.3))
    matrices.push({width,side,model:model.toArray(),view:camera.matrixWorldInverse.toArray(),projection:camera.projectionMatrix.toArray()})
  }
}
const chrome=spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--remote-debugging-port=0',`--user-data-dir=${join(tmpdir(),'ribbon-separation-'+Date.now())}`,'--no-first-run','--no-default-browser-check','--window-size=1920,1080','--hide-scrollbars'],{windowsHide:true,stdio:['ignore','ignore','pipe']})
let ws
try {
  const endpoint=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Chrome timeout')),15000)
    chrome.on('error',reject);chrome.on('exit',code=>reject(Error('Chrome exit '+code)))
    chrome.stderr.on('data',data=>{const m=data.toString().match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(timer);resolve(m[1])}})
  })
  const targets=await(await fetch(`http://${new URL(endpoint).host}/json/list`)).json()
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl)
  await new Promise(r=>ws.onopen=r)
  let id=0;const pending=new Map();const errors=[]
  ws.onmessage=({data})=>{const m=JSON.parse(data);if(pending.has(m.id)){const [r,j]=pending.get(m.id);pending.delete(m.id);m.error?j(m.error):r(m.result)}if(m.method==='Runtime.exceptionThrown'||(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error'))errors.push(m.params)}
  const send=(method,params={})=>new Promise((r,j)=>{pending.set(++id,[r,j]);ws.send(JSON.stringify({id,method,params}))})
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
  await send('Runtime.enable')
  const result = await evaluate(`(${verifyGPU.toString()})(${JSON.stringify(TRAVEL_DEFORMATION_GLSL)},${JSON.stringify(attributes)},${JSON.stringify(matrices)})`)
  if (errors.length) throw new Error(JSON.stringify(errors[0]))
  console.log('PASS: original wave profiles remain separated across a full cycle on both wings at desktop, tablet, and mobile sizes.', result)
} finally { ws?.close(); chrome.kill() }

function verifyGPU(shaderCode,attributes,matrices){
  const gl=document.createElement('canvas').getContext('webgl2')
  const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
  const program=gl.createProgram()
  gl.attachShader(program,compile(gl.VERTEX_SHADER,`#version 300 es\nprecision highp float;uniform mat4 modelMatrix,modelViewMatrix,projectionMatrix,viewMatrix;in vec3 position;in float aU;in float aAlpha;in vec3 color;out vec3 tint;${shaderCode.replaceAll('attribute ','in ')}out vec3 resultPosition;void main(){tint=color*aAlpha+vec3(aU);vec4 clip=flowClipPosition(position);resultPosition=clip.xyz/clip.w;gl_Position=clip;}`))
  gl.attachShader(program,compile(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;in vec3 tint;out vec4 color;void main(){color=vec4(tint,1);}'))
  gl.transformFeedbackVaryings(program,['resultPosition'],gl.INTERLEAVED_ATTRIBS);gl.linkProgram(program)
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program))
  gl.useProgram(program)
  const buffers={}
  for(const [name,{size,data}] of Object.entries(attributes)){const slot=gl.getAttribLocation(program,name);if(slot<0)continue;buffers[name]=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffers[name]);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);gl.enableVertexAttribArray(slot);gl.vertexAttribPointer(slot,size,gl.FLOAT,false,0,0)}
  const count=attributes.position.data.length/3,out=new Float32Array(count*3)
  const buffer=gl.createBuffer();gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,buffer);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,out.byteLength,gl.DYNAMIC_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);gl.enable(gl.RASTERIZER_DISCARD)
  const time=gl.getUniformLocation(program,'uTime');let minimumGap=Infinity,maximumXSpread=0,maxSeam=0
  for(const m of matrices){
    for(const name of ['position','aFlowCenter']){
      const data=new Float32Array(attributes[name].data);for(let i=0;i<data.length;i+=3)data[i]*=m.side
      gl.bindBuffer(gl.ARRAY_BUFFER,buffers[name]);gl.bufferSubData(gl.ARRAY_BUFFER,0,data)
    }
    for(const [name,data] of [['modelMatrix',m.model],['viewMatrix',m.view],['projectionMatrix',m.projection]])gl.uniformMatrix4fv(gl.getUniformLocation(program,name),false,data)
    let first
    for(let frame=0;frame<=64;frame++){
      gl.uniform1f(time,frame*2*Math.PI/.22/64)
      gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,count);gl.endTransformFeedback();gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,out)
      if(frame===0)first=out.slice()
      if(frame===64)out.forEach((v,i)=>maxSeam=Math.max(maxSeam,Math.abs(v-first[i])))
      for(let i=0;i<count;i+=20){
        const bands=[0,3,2,1].map(owner=>Array.from({length:5},(_,k)=>out[(i+owner*5+k)*3+1]));
        for(let j=0;j<3;j++)minimumGap=Math.min(minimumGap,Math.min(...bands[j])-Math.max(...bands[j+1]))
        const xs=Array.from({length:20},(_,j)=>out[(i+j)*3]);maximumXSpread=Math.max(maximumXSpread,Math.max(...xs)-Math.min(...xs))
        if(bands.flat().some(v=>!Number.isFinite(v))||bands.some((v,j)=>j<3&&Math.min(...v)<=Math.max(...bands[j+1])))throw Error('Crossing at '+JSON.stringify({width:m.width,side:m.side,frame,u:i/20/120,bands}))
        if(i>=20&&m.side*(out[i*3]-out[(i-20)*3])<=0)throw Error('Longitudinal fold')
      }
    }
  }
  if(maxSeam>1e-5||maximumXSpread>1e-5)throw Error(JSON.stringify({maxSeam,maximumXSpread}))
  return{minimumGap,maximumXSpread,maxSeam,frames:390,verticesPerFrame:count,maxAttributes:gl.getParameter(gl.MAX_VERTEX_ATTRIBS)}
}
