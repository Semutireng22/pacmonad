"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/** =================== CONSTANTS =================== */
const NONE=4,UP=3,LEFT=2,DOWN=1,RIGHT=11,WAITING=5,PAUSE=6,PLAYING=7,COUNTDOWN=8,EATEN_PAUSE=9,DYING=10;
const FPS=30, STEP_MS=1000/FPS;

type Vec={x:number;y:number};
type OnScoreSubmit=(score:number)=>void;

/** Tiles */
const WALL=0,BISCUIT=1,EMPTY=2,BLOCK=3,PILL=4;

/** ======== MAP & WALLS (asli, lengkap) ======== */
const MAP:number[][]=[
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	[0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
	[0,4,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,4,0],
	[0,1,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0],
	[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
	[0,1,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0],
	[0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
	[0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,0],
	[2,2,2,0,1,0,1,1,1,1,1,1,1,0,1,0,2,2,2],
	[0,0,0,0,1,0,1,0,0,3,0,0,1,0,1,0,0,0,0],
	[2,2,2,2,1,1,1,0,3,3,3,0,1,1,1,2,2,2,2],
	[0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0],
	[2,2,2,0,1,0,1,1,1,2,1,1,1,0,1,0,2,2,2],
	[0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0],
	[0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
	[0,1,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0],
	[0,4,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,4,0],
	[0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,0],
	[0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
	[0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0],
	[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
	[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];

const WALLS:any[]=[
  [{"move":[0,9.5]},{"line":[3,9.5]},{"curve":[3.5,9.5,3.5,9]},{"line":[3.5,8]},{"curve":[3.5,7.5,3,7.5]},{"line":[1,7.5]},{"curve":[0.5,7.5,0.5,7]},{"line":[0.5,1]},{"curve":[0.5,0.5,1,0.5]},{"line":[9,0.5]},{"curve":[9.5,0.5,9.5,1]},{"line":[9.5,3.5]}],
  [{"move":[9.5,1]},{"curve":[9.5,0.5,10,0.5]},{"line":[18,0.5]},{"curve":[18.5,0.5,18.5,1]},{"line":[18.5,7]},{"curve":[18.5,7.5,18,7.5]},{"line":[16,7.5]},{"curve":[15.5,7.5,15.5,8]},{"line":[15.5,9]},{"curve":[15.5,9.5,16,9.5]},{"line":[19,9.5]}],
  [{"move":[2.5,5.5]},{"line":[3.5,5.5]}],
  [{"move":[3,2.5]},{"curve":[3.5,2.5,3.5,3]},{"curve":[3.5,3.5,3,3.5]},{"curve":[2.5,3.5,2.5,3]},{"curve":[2.5,2.5,3,2.5]}],
  [{"move":[15.5,5.5]},{"line":[16.5,5.5]}],
  [{"move":[16,2.5]},{"curve":[16.5,2.5,16.5,3]},{"curve":[16.5,3.5,16,3.5]},{"curve":[15.5,3.5,15.5,3]},{"curve":[15.5,2.5,16,2.5]}],
  [{"move":[6,2.5]},{"line":[7,2.5]},{"curve":[7.5,2.5,7.5,3]},{"curve":[7.5,3.5,7,3.5]},{"line":[6,3.5]},{"curve":[5.5,3.5,5.5,3]},{"curve":[5.5,2.5,6,2.5]}],
  [{"move":[12,2.5]},{"line":[13,2.5]},{"curve":[13.5,2.5,13.5,3]},{"curve":[13.5,3.5,13,3.5]},{"line":[12,3.5]},{"curve":[11.5,3.5,11.5,3]},{"curve":[11.5,2.5,12,2.5]}],
  [{"move":[7.5,5.5]},{"line":[9,5.5]},{"curve":[9.5,5.5,9.5,6]},{"line":[9.5,7.5]}],
  [{"move":[9.5,6]},{"curve":[9.5,5.5,10.5,5.5]},{"line":[11.5,5.5]}],
  [{"move":[5.5,5.5]},{"line":[5.5,7]},{"curve":[5.5,7.5,6,7.5]},{"line":[7.5,7.5]}],
  [{"move":[6,7.5]},{"curve":[5.5,7.5,5.5,8]},{"line":[5.5,9.5]}],
  [{"move":[13.5,5.5]},{"line":[13.5,7]},{"curve":[13.5,7.5,13,7.5]},{"line":[11.5,7.5]}],
  [{"move":[13,7.5]},{"curve":[13.5,7.5,13.5,8]},{"line":[13.5,9.5]}],
  [{"move":[0,11.5]},{"line":[3,11.5]},{"curve":[3.5,11.5,3.5,12]},{"line":[3.5,13]},{"curve":[3.5,13.5,3,13.5]},{"line":[1,13.5]},{"curve":[0.5,13.5,0.5,14]},{"line":[0.5,17]},{"curve":[0.5,17.5,1,17.5]},{"line":[1.5,17.5]}],
  [{"move":[1,17.5]},{"curve":[0.5,17.5,0.5,18]},{"line":[0.5,21]},{"curve":[0.5,21.5,1,21.5]},{"line":[18,21.5]},{"curve":[18.5,21.5,18.5,21]},{"line":[18.5,18]},{"curve":[18.5,17.5,18,17.5]},{"line":[17.5,17.5]}],
  [{"move":[18,17.5]},{"curve":[18.5,17.5,18.5,17]},{"line":[18.5,14]},{"curve":[18.5,13.5,18,13.5]},{"line":[16,13.5]},{"curve":[15.5,13.5,15.5,13]},{"line":[15.5,12]},{"curve":[15.5,11.5,16,11.5]},{"line":[19,11.5]}],
  [{"move":[5.5,11.5]},{"line":[5.5,13.5]}],
  [{"move":[13.5,11.5]},{"line":[13.5,13.5]}],
  [{"move":[2.5,15.5]},{"line":[3,15.5]},{"curve":[3.5,15.5,3.5,16]},{"line":[3.5,17.5]}],
  [{"move":[16.5,15.5]},{"line":[16,15.5]},{"curve":[15.5,15.5,15.5,16]},{"line":[15.5,17.5]}],
  [{"move":[5.5,15.5]},{"line":[7.5,15.5]}],
  [{"move":[11.5,15.5]},{"line":[13.5,15.5]}],
  [{"move":[2.5,19.5]},{"line":[5,19.5]},{"curve":[5.5,19.5,5.5,19]},{"line":[5.5,17.5]}],
  [{"move":[5.5,19]},{"curve":[5.5,19.5,6,19.5]},{"line":[7.5,19.5]}],
  [{"move":[11.5,19.5]},{"line":[13,19.5]},{"curve":[13.5,19.5,13.5,19]},{"line":[13.5,17.5]}],
  [{"move":[13.5,19]},{"curve":[13.5,19.5,14,19.5]},{"line":[16.5,19.5]}],
  [{"move":[7.5,13.5]},{"line":[9,13.5]},{"curve":[9.5,13.5,9.5,14]},{"line":[9.5,15.5]}],
  [{"move":[9.5,14]},{"curve":[9.5,13.5,10,13.5]},{"line":[11.5,13.5]}],
  [{"move":[7.5,17.5]},{"line":[9,17.5]},{"curve":[9.5,17.5,9.5,18]},{"line":[9.5,19.5]}],
  [{"move":[9.5,18]},{"curve":[9.5,17.5,10,17.5]},{"line":[11.5,17.5]}],
  [{"move":[8.5,9.5]},{"line":[8,9.5]},{"curve":[7.5,9.5,7.5,10]},{"line":[7.5,11]},{"curve":[7.5,11.5,8,11.5]},{"line":[11,11.5]},{"curve":[11.5,11.5,11.5,11]},{"line":[11.5,10]},{"curve":[11.5,9.5,11,9.5]},{"line":[10.5,9.5]}]
];

/** tools */
const clone2D=(m:number[][])=>m.map(r=>r.slice());

/** =================== AUDIO =================== */
function useAudio(root:string){
  const files=useRef<Record<string,HTMLAudioElement>>({});
  const playing=useRef<string[]>([]);
  const disabled=()=>localStorage.getItem("soundDisabled")==="true";
  const load=(name:string,src:string,cb:()=>void)=>{
    const a=document.createElement("audio");
    a.preload="true"; a.src=src;
    const onReady=()=>{a.removeEventListener("canplaythrough",onReady,true); cb();};
    a.addEventListener("canplaythrough",onReady,true);
    files.current[name]=a; a.pause();
  };
  const play=(n:string)=>{ if(disabled()) return; const a=files.current[n]; if(!a) return;
    const onEnd=()=>{a.removeEventListener("ended",onEnd,true); playing.current=playing.current.filter(x=>x!==n);};
    playing.current.push(n); a.addEventListener("ended",onEnd,true); a.currentTime=0; void a.play();
  };
  const pause =()=>playing.current.forEach(n=>files.current[n]?.pause());
  const resume=()=>!disabled()&&playing.current.forEach(n=>files.current[n]?.play());
  const stopAll=()=>{playing.current.forEach(n=>{const a=files.current[n]; if(a){a.pause(); a.currentTime=0;}}); playing.current=[];};
  const loadAll=(cb:()=>void)=>{
    const ext=new Audio().canPlayType("audio/ogg")?"ogg":"mp3";
    const arr:[string,string][]= [
      ["start",`${root}audio/opening_song.${ext}`],
      ["die",`${root}audio/die.${ext}`],
      ["eatghost",`${root}audio/eatghost.${ext}`],
      ["eatpill",`${root}audio/eatpill.${ext}`],
      ["eating",`${root}audio/eating.short.${ext}`],
      ["eating2",`${root}audio/eating.short.${ext}`],
    ];
    let left=arr.length;
    arr.forEach(([n,p])=>load(n,p,()=>{ if(--left===0) cb(); }));
  };
  return {loadAll,play,pause,resume,stopAll};
}

/** =================== MAIN COMPONENT =================== */
export default function ClassicPacman({
  wallet,
  username,
  onScoreSubmit,
  rootAssetBase="https://raw.githubusercontent.com/daleharvey/pacman/master/",
}:{
  wallet:string|null;
  username:string|null;
  onScoreSubmit?:OnScoreSubmit;
  rootAssetBase?:string;
}) {
  const bgRef=useRef<HTMLCanvasElement|null>(null);
  const fxRef=useRef<HTMLCanvasElement|null>(null);

  const [state,setState]=useState(WAITING);
  const [level,setLevel]=useState(1);
  const [score,setScore]=useState(0);
  const [lives,setLives]=useState(3);
  const [audioReady,setAudioReady]=useState(false);

  const audio=useAudio(rootAssetBase);

  /** runtime */
  const mapRef=useRef<number[][]>(clone2D(MAP));
  const blockSizeRef=useRef(18);
  const tickRef=useRef(0);
  const eatenCountRef=useRef(0);
  const timerStartRef=useRef(0);
  const lastCountdownRef=useRef(0);

  const userPos=useRef<Vec>({x:90,y:120});
  const userDir=useRef<number>(LEFT);
  const userDue=useRef<number>(LEFT);

  type Ghost={pos:Vec;dir:number;due:number;eatable:number|null;eaten:number|null;color:string};
  const ghosts=useRef<Ghost[]>([]);
  const ghostColors=["#00FFDE","#FF0000","#FFB8DE","#FFB847"];

  /** helpers grid */
  const getTick=()=>tickRef.current;
  const point=(x:number)=>Math.round(x/10);
  const onWhole=(x:number)=>x%10===0;
  const onGrid=(p:Vec)=>onWhole(p.x)&&onWhole(p.y);
  const nextSquare=(x:number,dir:number)=>{const r=x%10; if(r===0)return x; return (dir===RIGHT||dir===DOWN)?x+(10-r):x-r;};
  const next=(p:Vec,dir:number)=>({y:point(nextSquare(p.y,dir)),x:point(nextSquare(p.x,dir))});
  const inB=(y:number,x:number)=>y>=0&&y<mapRef.current.length&&x>=0&&x<mapRef.current[0].length;
  const isWall=(pos:{y:number;x:number})=>inB(pos.y,pos.x)&&mapRef.current[pos.y][pos.x]===WALL;
  const isFloor=(pos:{y:number;x:number})=>{
    if(!inB(pos.y,pos.x))return false;
    const v=mapRef.current[pos.y][pos.x];
    return v===EMPTY||v===BISCUIT||v===PILL;
  };

  /** drawing */
  const drawWalls=(ctx:CanvasRenderingContext2D)=>{
    const s=blockSizeRef.current; ctx.strokeStyle="#00F"; ctx.lineWidth=5; ctx.lineCap="round";
    for(const line of WALLS){
      ctx.beginPath();
      for(const seg of line){
        if(seg.move) ctx.moveTo(seg.move[0]*s, seg.move[1]*s);
        else if(seg.line) ctx.lineTo(seg.line[0]*s, seg.line[1]*s);
        else if(seg.curve) ctx.quadraticCurveTo(seg.curve[0]*s, seg.curve[1]*s, seg.curve[2]*s, seg.curve[3]*s);
      }
      ctx.stroke();
    }
  };

  const drawBG=()=>{
    const c=bgRef.current; if(!c) return; const ctx=c.getContext("2d"); if(!ctx) return;
    const s=blockSizeRef.current,h=mapRef.current.length,w=mapRef.current[0].length;
    ctx.fillStyle="#000"; ctx.fillRect(0,0,w*s,h*s);
    drawWalls(ctx);
  };

  const drawFood=(ctx:CanvasRenderingContext2D,pulse:number)=>{
    const s=blockSizeRef.current,h=mapRef.current.length,w=mapRef.current[0].length;
    // biscuits
    ctx.fillStyle="#FFF";
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      if(mapRef.current[y][x]===BISCUIT){
        ctx.fillRect(x*s+s/2.5, y*s+s/2.5, s/6, s/6);
      }
    }
    // pills
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      if(mapRef.current[y][x]===PILL){
        ctx.beginPath();
        const r=Math.abs(5 - pulse/3);
        ctx.arc(x*s+s/2, y*s+s/2, r, 0, Math.PI*2, false);
        ctx.fill();
        ctx.closePath();
      }
    }
  };

  const drawDialog=(ctx:CanvasRenderingContext2D,text:string)=>{
    ctx.fillStyle="#FF0"; ctx.font="18px Calibri, Arial, sans-serif";
    const w=mapRef.current[0].length*blockSizeRef.current;
    const x=(w-ctx.measureText(text).width)/2;
    ctx.fillText(text,x,mapRef.current.length*10 + 8);
  };

  const drawFooter=(ctx:CanvasRenderingContext2D)=>{
    const s=blockSizeRef.current;
    const top=mapRef.current.length*s, w=mapRef.current[0].length*s, textY=top+17;
    ctx.fillStyle="#000"; ctx.fillRect(0,top,w,30);
    // lives
    ctx.fillStyle="#FF0";
    for(let i=0;i<lives;i++){
      ctx.beginPath();
      const cx=150+25*i + s/2, cy=top+1+s/2;
      ctx.moveTo(cx,cy); ctx.arc(cx,cy,s/2,Math.PI*0.25,Math.PI*1.75,false); ctx.fill();
    }
    const mute = localStorage.getItem("soundDisabled")==="true";
    ctx.fillStyle=mute?"#F00":"#0F0"; ctx.font="bold 16px sans-serif"; ctx.fillText("s",10,textY);
    ctx.fillStyle="#FF0"; ctx.font="14px Calibri, Arial, sans-serif";
    ctx.fillText(`Score: ${score}`,30,textY); ctx.fillText(`Level: ${level}`,260,textY);
  };

  const drawUser=(ctx:CanvasRenderingContext2D)=>{
    const s=blockSizeRef.current, p=userPos.current;
    const ang=(d:number,pos:Vec)=>{
      if(d===RIGHT && pos.x%10<5) return {a:0.25,b:1.75,rev:false};
      if(d===DOWN  && pos.y%10<5) return {a:0.75,b:2.25,rev:false};
      if(d===UP    && pos.y%10<5) return {a:1.25,b:1.75,rev:true};
      if(d===LEFT  && pos.x%10<5) return {a:0.75,b:1.25,rev:true};
      return {a:0,b:2,rev:false};
    };
    const A=ang(userDir.current,p);
    ctx.fillStyle="#FF0"; ctx.beginPath();
    ctx.moveTo((p.x/10)*s + s/2, (p.y/10)*s + s/2);
    ctx.arc((p.x/10)*s + s/2, (p.y/10)*s + s/2, s/2, Math.PI*A.a, Math.PI*A.b, A.rev);
    ctx.fill();
  };

  const drawUserDead=(ctx:CanvasRenderingContext2D,t:number)=>{
    const s=blockSizeRef.current, p=userPos.current, half=s/2;
    if(t>=1) return; ctx.fillStyle="#FF0"; ctx.beginPath();
    const cx=(p.x/10)*s + half, cy=(p.y/10)*s + half;
    ctx.moveTo(cx,cy); ctx.arc(cx,cy,half,0,Math.PI*2*t,true); ctx.fill();
  };

  const secAgo=(tick:number|null)=> tick==null?1e9:(getTick()-tick)/FPS;

  const drawGhost=(ctx:CanvasRenderingContext2D,g:Ghost)=>{
    const s=blockSizeRef.current, top=(g.pos.y/10)*s, left=(g.pos.x/10)*s;
    let col=g.color;
    if(g.eatable!=null) col = secAgo(g.eatable)>5 ? (getTick()%20>10?"#FFF":"#00B") : "#00B";
    else if(g.eaten!=null) col="#222";
    if(g.eatable!=null && secAgo(g.eatable)>8) g.eatable=null;
    if(g.eaten!=null   && secAgo(g.eaten)>3)   g.eaten=null;

    const tl=left+s, base=top+s-3, inc=s/10, high=getTick()%10>5?3:-3, low=getTick()%10>5?-3:3;
    ctx.fillStyle=col; ctx.beginPath();
    ctx.moveTo(left,base); ctx.quadraticCurveTo(left,top,left+s/2,top); ctx.quadraticCurveTo(left+s,top,left+s,base);
    ctx.quadraticCurveTo(tl-inc*1,base+high,tl-inc*2,base);
    ctx.quadraticCurveTo(tl-inc*3,base+low, tl-inc*4,base);
    ctx.quadraticCurveTo(tl-inc*5,base+high,tl-inc*6,base);
    ctx.quadraticCurveTo(tl-inc*7,base+low, tl-inc*8,base);
    ctx.quadraticCurveTo(tl-inc*9,base+high,tl-inc*10,base);
    ctx.closePath(); ctx.fill();

    ctx.beginPath(); ctx.fillStyle="#FFF";
    ctx.arc(left+6, top+6, s/6, 0, 300, false);
    ctx.arc(left+s-6, top+6, s/6, 0, 300, false);
    ctx.closePath(); ctx.fill();

    const f=s/12, offs:Record<number,[number,number]>={[RIGHT]:[f,0],[LEFT]:[-f,0],[UP]:[0,-f],[DOWN]:[0,f],[NONE]:[0,0]};
    const o=offs[g.dir]??[0,0];
    ctx.beginPath(); ctx.fillStyle="#000";
    ctx.arc(left+6+o[0], top+6+o[1], s/15, 0, 300, false);
    ctx.arc(left+s-6+o[0], top+6+o[1], s/15, 0, 300, false);
    ctx.closePath(); ctx.fill();
  };

  /** movement helpers */
  const userCoord=(d:number,c:Vec):Vec=>({x:c.x+((d===LEFT&&-2)||(d===RIGHT&&2)||0), y:c.y+((d===DOWN&&2)||(d===UP&&-2)||0)});
  const bound=(x1:number,x2:number)=>{const r=x1%10,res=r+x2; if(r!==0&&res>10) return x1+(10-r); if(r>0&&res<0) return x1-r; return x1+x2;};
  const ghostCoord=(d:number,c:Vec,g:Ghost):Vec=>{
    const sp=g.eatable!=null?1:g.eaten!=null?4:2;
    const xs=(d===LEFT?-sp:d===RIGHT?sp:0), ys=(d===DOWN?sp:d===UP?-sp:0);
    return {x:bound(c.x,xs), y:bound(c.y,ys)};
  };
  const opposite=(d:number)=>(d===LEFT&&RIGHT)||(d===RIGHT&&LEFT)||(d===UP&&DOWN)||UP;

  const pane=(pos:Vec,dir:number):Vec|false=>{
    if(pos.y===100 && dir===RIGHT && pos.x>=190) return {y:100,x:-10};
    if(pos.y===100 && dir===LEFT  && pos.x<=-10) return {y:100,x:190};
    return false;
  };

  /** events */
  const eatenPill=()=>{
    audio.play("eatpill"); timerStartRef.current=getTick(); eatenCountRef.current=0;
    ghosts.current=ghosts.current.map(g=>({...g, dir:opposite(g.dir), eatable:getTick()}));
  };

  const startLevel=()=>{
    userPos.current={x:90,y:120}; userDir.current=LEFT; userDue.current=LEFT;
    ghosts.current=ghostColors.map(c=>({pos:{x:90,y:80},dir:Math.random()<0.5?UP:DOWN,due:Math.random()<0.5?LEFT:RIGHT,eatable:null,eaten:null,color:c}));
    audio.play("start"); timerStartRef.current=getTick(); setState(COUNTDOWN);
  };

  const startNew=()=>{
    setState(WAITING); setLevel(1); setLives(3); setScore(0);
    mapRef.current=clone2D(MAP); startLevel();
  };

  const loseLife=(fx:CanvasRenderingContext2D)=>{
    setState(WAITING);
    setLives(prev=>{
      const left=prev-1;
      if(left>0) startLevel();
      else{
        fx.clearRect(0,0,fx.canvas.width,fx.canvas.height);
        drawDialog(fx,"GAME OVER");
        onScoreSubmit?.(score);
      }
      return left;
    });
  };

  /** ===== Fixed-step STEP ===== */
  const pulseRef=useRef(0);
  const step=()=>{
    const fx=fxRef.current?.getContext("2d"); if(!fx) return;
    const s=blockSizeRef.current, W=mapRef.current[0].length*s, H=mapRef.current.length*s;

    fx.clearRect(0,0,W,H);
    drawFood(fx,pulseRef.current);

    if(state===PLAYING){
      // GHOSTS
      ghosts.current=ghosts.current.map(g=>{
        const onG=onGrid(g.pos);
        let due=g.due;

        const forward=ghostCoord(g.dir,g.pos,g);
        const fBlocked = onG && isWall({y:point(nextSquare(forward.y,g.dir)), x:point(nextSquare(forward.x,g.dir))});

        if(onG && fBlocked){
          const moves=(g.dir===LEFT||g.dir===RIGHT)?[UP,DOWN]:[LEFT,RIGHT];
          const opts=moves.filter(m=>{
            if(m===opposite(g.dir)) return false;
            const np=ghostCoord(m,g.pos,g);
            return !isWall({y:point(nextSquare(np.y,m)), x:point(nextSquare(np.x,m))});
          });
          if(opts.length>0) due=opts[Math.floor(Math.random()*opts.length)];
        }

        let npos=ghostCoord(due,g.pos,g);
        if(onG && isWall({y:point(nextSquare(npos.y,due)),x:point(nextSquare(npos.x,due))})){
          due=opposite(g.dir);
          npos=ghostCoord(due,g.pos,g);
          if(onG && isWall({y:point(nextSquare(npos.y,due)),x:point(nextSquare(npos.x,due))})) npos=g.pos;
        }

        const wrap=pane(npos,due); if(wrap) npos=wrap;
        return {...g,pos:npos,dir:due,due};
      });

      // USER
      let npos=userCoord(userDue.current,userPos.current);
      const samePlane= ((userDue.current===LEFT||userDue.current===RIGHT)&&(userDir.current===LEFT||userDir.current===RIGHT)) ||
                       ((userDue.current===UP||userDue.current===DOWN )&&(userDir.current===UP  ||userDir.current===DOWN));
      if(samePlane || (onGrid(userPos.current) && isFloor(next(npos,userDue.current)))){
        userDir.current=userDue.current;
      } else {
        npos=userCoord(userDir.current,userPos.current);
      }
      if(onGrid(userPos.current) && isWall(next(npos,userDir.current))) userDir.current=NONE;
      if(userDir.current!==NONE){
        if(npos.y===100 && npos.x>=190 && userDir.current===RIGHT) npos={y:100,x:-10};
        if(npos.y===100 && npos.x<=-12 && userDir.current===LEFT)  npos={y:100,x:190};
        userPos.current=npos;
      }

      // EAT TILE
      const ns=next(userPos.current,userDir.current);
      const block=mapRef.current[ns.y]?.[ns.x];
      const mid=(v:number)=>{const r=v%10; return r>3||r<7;};
      if((mid(userPos.current.x)||mid(userPos.current.y)) && (block===BISCUIT||block===PILL)){
        mapRef.current[ns.y][ns.x]=EMPTY;
        setScore(sv=>{
          const add=block===BISCUIT?10:50;
          const n=sv+add;
          if(n>=10000 && sv<10000) setLives(v=>v+1);
          return n;
        });
        eatenCountRef.current++;
        if(eatenCountRef.current===182){ setLevel(l=>l+1); mapRef.current=clone2D(MAP); startLevel(); }
        if(block===PILL) eatenPill();
      }

      // COLLISION
      const hit=(a:Vec,b:Vec)=>Math.hypot(b.x-a.x,b.y-a.y)<10;
      for(const g of ghosts.current){
        if(hit(userPos.current,g.pos)){
          if(g.eatable!=null){
            audio.play("eatghost");
            g.eatable=null; g.eaten=getTick();
            setScore(sv=>sv+200);
            setState(EATEN_PAUSE); timerStartRef.current=getTick();
          } else if(g.eaten==null){
            audio.play("die");
            setState(DYING); timerStartRef.current=getTick();
            break;
          }
        }
      }
    } else if(state===WAITING){
      drawDialog(fx,"Press N/Space (or Start) to play");
    } else if(state===EATEN_PAUSE && getTick()-timerStartRef.current>FPS/3){
      setState(PLAYING);
    } else if(state===DYING){
      if(getTick()-timerStartRef.current>FPS*2){ loseLife(fx); }
      else drawUserDead(fx,(getTick()-timerStartRef.current)/(FPS*2));
    } else if(state===COUNTDOWN){
      const diff=5 + Math.floor((timerStartRef.current-getTick())/FPS);
      if(diff===0) setState(PLAYING);
      else if(diff!==lastCountdownRef.current){ lastCountdownRef.current=diff; drawDialog(fx,`Starting in: ${diff}`); }
    }

    // entities & HUD
    ghosts.current.forEach(g=>drawGhost(fx,g));
    drawUser(fx);
    drawFooter(fx);

    // tick & pulse
    if(state!==PAUSE) tickRef.current++;
    pulseRef.current=(pulseRef.current+1)%31;
  };

  /** rAF */
  const raf=useRef<number|undefined>(undefined);
  const lastT=useRef(0), acc=useRef(0);
  const loop=(ts:number)=>{
    if(!lastT.current) lastT.current=ts;
    const dt=ts-lastT.current; lastT.current=ts; acc.current+=dt;
    while(acc.current>=STEP_MS){ step(); acc.current-=STEP_MS; }
    raf.current=requestAnimationFrame(loop);
  };

  /** effects */
  // audio
  useEffect(()=>{ audio.loadAll(()=>setAudioReady(true)); return ()=>audio.stopAll(); },[]);

  // size & BG
  useEffect(()=>{
    const parent=fxRef.current?.parentElement;
    const resize=()=>{
      if(!bgRef.current||!fxRef.current||!parent) return;
      const width=parent.clientWidth;
      blockSizeRef.current=Math.max(14, Math.min(Math.floor(width/19), 28));
      const w=blockSizeRef.current*19, h=blockSizeRef.current*22+30;
      [bgRef.current,fxRef.current].forEach(c=>{ c.width=w; c.height=h; c.style.width="100%"; c.style.height="auto"; });
      drawBG();
      const fx=fxRef.current.getContext("2d"); fx?.clearRect(0,0,w,h);
    };
    resize();
    const ro=new ResizeObserver(resize); parent&&ro.observe(parent);
    return ()=>ro.disconnect();
  },[]);

  // rAF
  useEffect(()=>{
    if(raf.current) cancelAnimationFrame(raf.current);
    lastT.current=0; acc.current=0; raf.current=requestAnimationFrame(loop);
    return ()=>{ if(raf.current) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[state,level,score,lives,audioReady]);

  // keyboard
  useEffect(()=>{
    const KD=(e:KeyboardEvent)=>{
      if((e.key===" " || e.key==="n" || e.key==="N") && state===WAITING){ startNew(); e.preventDefault(); return; }
      if(e.key==="s"||e.key==="S"){ const cur=localStorage.getItem("soundDisabled")==="true"; localStorage.setItem("soundDisabled",(!cur).toString()); }
      if(e.key==="p"||e.key==="P"){ setState(s=>s===PAUSE?WAITING:PAUSE); if(state===PAUSE) audio.resume(); else audio.pause(); }
      if(state===PAUSE) return;
      const map:Record<number,number>={[37]:LEFT,[38]:UP,[39]:RIGHT,[40]:DOWN,65:LEFT,87:UP,68:RIGHT,83:DOWN};
      const d=map[e.keyCode]; if(typeof d!=="undefined"){ userDue.current=d; e.preventDefault(); }
    };
    const KP=(e:KeyboardEvent)=>{ if(state!==WAITING&&state!==PAUSE){ e.preventDefault(); } };
    document.addEventListener("keydown",KD,{capture:true});
    document.addEventListener("keypress",KP,{capture:true});
    return ()=>{ document.removeEventListener("keydown",KD,true); document.removeEventListener("keypress",KP,true); };
  },[state,audio]);

  // swipe anti-scroll
  useEffect(()=>{
    const el=fxRef.current; if(!el) return;
    let sx=0,sy=0,active=false; const TH=20;
    const dir=(dx:number,dy:number)=>Math.abs(dx)>Math.abs(dy)?(dx>0?RIGHT:LEFT):(dy>0?DOWN:UP);
    const start=(e:TouchEvent)=>{ active=true; sx=e.touches[0].clientX; sy=e.touches[0].clientY; e.preventDefault(); };
    const move =(e:TouchEvent)=>{ if(!active) return; const dx=e.touches[0].clientX-sx, dy=e.touches[0].clientY-sy;
      if(Math.abs(dx)<TH && Math.abs(dy)<TH){ e.preventDefault(); return; }
      userDue.current=dir(dx,dy); active=false; e.preventDefault();
    };
    const end  =(e:TouchEvent)=>{ active=false; e.preventDefault(); };
    el.addEventListener("touchstart",start,{passive:false});
    el.addEventListener("touchmove",move,{passive:false});
    el.addEventListener("touchend", end ,{passive:false});
    return ()=>{ el.removeEventListener("touchstart",start); el.removeEventListener("touchmove",move); el.removeEventListener("touchend",end); };
  },[]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="px-2 py-1 rounded bg-neutral-900/70 border border-neutral-800">Score: <b>{score}</b></div>
        <div className="px-2 py-1 rounded bg-neutral-900/70 border border-neutral-800">Level: <b>{level}</b></div>
        <div className="px-2 py-1 rounded bg-neutral-900/70 border border-neutral-800">Lives: <b>{lives}</b></div>
        {username ? (
          <div className="px-2 py-1 rounded bg-neutral-900/70 border border-neutral-800">@{username}</div>
        ) : wallet ? (
          <a className="px-3 py-1 rounded bg-yellow-400 text-black hover:bg-yellow-300" href="https://monad-games-id-site.vercel.app/" target="_blank" rel="noreferrer">
            Reserve your Monad Games ID username
          </a>
        ) : null}
      </div>

      {/* wrapper TANPA padding; overlay canvas 1:1 */}
      <div className="relative w-full rounded-2xl border border-neutral-800 bg-black shadow-inner overflow-hidden">
        {state===WAITING && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
            <button
              onClick={startNew}
              className="px-5 py-3 rounded-2xl bg-yellow-400 text-black font-medium hover:bg-yellow-300 active:scale-[0.99]"
            >
              Start
            </button>
          </div>
        )}
        <div className="relative w-full">
          <canvas ref={bgRef} className="block w-full h-auto absolute inset-0 select-none touch-none" />
          <canvas ref={fxRef} className="block w-full h-auto absolute inset-0 select-none touch-none" />
        </div>
      </div>

      <p className="text-xs text-neutral-400">
        Controls: Arrow / WASD • Mobile: swipe • Space/N = Start • P = Pause • S = Toggle Sound
      </p>
    </div>
  );
}