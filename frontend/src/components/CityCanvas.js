import React, { useEffect, useRef } from 'react';

// Animated city skyline data
const BUILDINGS = [
  { x:0,   w:60,  h:140, windows:[[8,20],[8,40],[8,60],[8,80],[30,20],[30,40],[30,60],[30,80]] },
  { x:55,  w:40,  h:180, windows:[[8,20],[8,45],[8,70],[8,95],[8,120],[24,20],[24,45],[24,70],[24,95],[24,120]] },
  { x:90,  w:80,  h:110, windows:[[10,15],[10,35],[10,55],[35,15],[35,35],[35,55],[58,15],[58,35],[58,55]] },
  { x:165, w:50,  h:200, windows:[[8,20],[8,45],[8,70],[8,95],[8,120],[8,145],[32,20],[32,45],[32,70],[32,95],[32,120],[32,145]] },
  { x:210, w:70,  h:130, windows:[[10,15],[10,40],[10,65],[10,90],[38,15],[38,40],[38,65],[38,90]] },
  { x:275, w:45,  h:170, windows:[[8,15],[8,40],[8,65],[8,90],[8,115],[28,15],[28,40],[28,65],[28,90],[28,115]] },
  { x:315, w:90,  h:100, windows:[[10,15],[10,35],[38,15],[38,35],[66,15],[66,35]] },
  { x:400, w:55,  h:190, windows:[[8,15],[8,40],[8,65],[8,90],[8,115],[8,140],[35,15],[35,40],[35,65],[35,90],[35,115],[35,140]] },
  { x:450, w:65,  h:120, windows:[[10,15],[10,40],[10,65],[36,15],[36,40],[36,65]] },
  { x:510, w:40,  h:160, windows:[[8,15],[8,40],[8,65],[8,90],[8,115],[24,15],[24,40],[24,65],[24,90],[24,115]] },
  { x:545, w:85,  h:145, windows:[[10,15],[10,40],[10,65],[10,100],[38,15],[38,40],[38,65],[38,100],[62,15],[62,40],[62,65],[62,100]] },
  { x:625, w:50,  h:175, windows:[[8,15],[8,40],[8,65],[8,90],[8,120],[32,15],[32,40],[32,65],[32,90],[32,120]] },
  { x:670, w:75,  h:105, windows:[[10,15],[10,40],[10,65],[36,15],[36,40],[36,65],[58,15],[58,40],[58,65]] },
  { x:740, w:42,  h:185, windows:[[7,15],[7,40],[7,65],[7,90],[7,120],[26,15],[26,40],[26,65],[26,90],[26,120]] },
];

export default function CityCanvas() {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H;
    const resize = () => { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({length:120}, () => ({
      x:Math.random(), y:Math.random()*0.6, r:Math.random()*1.5+0.3,
      phase:Math.random()*Math.PI*2, speed:Math.random()*0.02+0.005,
    }));
    const particles = Array.from({length:25}, () => ({
      x:Math.random()*800, y:Math.random()*300,
      vx:(Math.random()-0.5)*0.4, vy:-(Math.random()*0.3+0.1),
      life:Math.random(),
      color:['#4488ff','#00cc66','#ff8800','#aa44ff'][Math.floor(Math.random()*4)],
    }));

    const draw = (t) => {
      const T = t * 0.001;
      ctx.clearRect(0,0,W,H);
      const sky = ctx.createLinearGradient(0,0,0,H);
      sky.addColorStop(0,'#000510'); sky.addColorStop(0.6,'#010a18'); sky.addColorStop(1,'#020e25');
      ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);

      stars.forEach(s => {
        const blink = 0.5+0.5*Math.sin(T*s.speed*10+s.phase);
        ctx.beginPath(); ctx.arc(s.x*W, s.y*H, s.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${0.3+blink*0.5})`; ctx.fill();
      });

      // Moon
      const mx=W*0.85, my=H*0.12;
      const mg = ctx.createRadialGradient(mx,my,0,mx,my,70);
      mg.addColorStop(0,'rgba(200,220,255,0.1)'); mg.addColorStop(1,'transparent');
      ctx.fillStyle=mg; ctx.fillRect(0,0,W,H);
      ctx.beginPath(); ctx.arc(mx,my,20,0,Math.PI*2); ctx.fillStyle='rgba(230,240,255,0.85)'; ctx.fill();
      ctx.beginPath(); ctx.arc(mx+7,my-4,16,0,Math.PI*2); ctx.fillStyle='#000510'; ctx.fill();

      const base = H * 0.63;
      const scale = W / 800;

      BUILDINGS.forEach(b => {
        const bx=b.x*scale, bw=b.w*scale, bh=b.h*scale, by=base-bh;
        const bg=ctx.createLinearGradient(bx,by,bx+bw,by);
        bg.addColorStop(0,'#0a1525'); bg.addColorStop(0.5,'#0d1e33'); bg.addColorStop(1,'#091220');
        ctx.fillStyle=bg; ctx.fillRect(bx,by,bw,bh);
        ctx.fillStyle='rgba(68,136,255,0.07)';
        ctx.fillRect(bx,by,1.5,bh); ctx.fillRect(bx+bw-1.5,by,1.5,bh);

        b.windows.forEach(([wx,wy]) => {
          const wwx=bx+wx*scale, wwy=by+wy*scale, www=5*scale, wwh=7*scale;
          const on = Math.sin(T*0.3+wx*0.5+wy*0.3+b.x*0.1) > -0.3;
          if (on) {
            const wcs=['rgba(255,220,120,','rgba(180,220,255,','rgba(120,255,180,'];
            ctx.fillStyle=wcs[(wx+wy+b.x)%3]+'0.85)'; ctx.fillRect(wwx,wwy,www,wwh);
            ctx.fillStyle=wcs[(wx+wy+b.x)%3]+'0.12)'; ctx.fillRect(wwx-2,wwy-2,www+4,wwh+4);
          } else { ctx.fillStyle='rgba(20,40,70,0.5)'; ctx.fillRect(wwx,wwy,www,wwh); }
        });

        if (b.h > 150) {
          ctx.strokeStyle='rgba(68,136,255,0.3)'; ctx.lineWidth=1.5*scale;
          ctx.beginPath(); ctx.moveTo(bx+bw/2,by); ctx.lineTo(bx+bw/2,by-18*scale); ctx.stroke();
          ctx.beginPath(); ctx.arc(bx+bw/2,by-20*scale,2.5*scale,0,Math.PI*2);
          ctx.fillStyle=`rgba(255,80,80,${0.5+0.5*Math.sin(T*2+b.x)})`; ctx.fill();
        }
      });

      const gg=ctx.createLinearGradient(0,base,0,H);
      gg.addColorStop(0,'#050d1a'); gg.addColorStop(1,'#020810');
      ctx.fillStyle=gg; ctx.fillRect(0,base,W,H-base);

      ctx.strokeStyle='rgba(68,136,255,0.12)'; ctx.lineWidth=1; ctx.setLineDash([20,15]);
      ctx.beginPath(); ctx.moveTo(0,base+18); ctx.lineTo(W,base+18); ctx.stroke(); ctx.setLineDash([]);

      const car1x=((T*60)%(W+100))-50, car2x=W-((T*40)%(W+100));
      [[car1x,'#ff8800'],[car2x,'#4488ff']].forEach(([cx,cc])=>{
        ctx.fillStyle=cc; ctx.fillRect(cx,base+10,28,10);
        ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillRect(cx+22,base+12,8,6);
        ctx.fillStyle=cc+'22'; ctx.fillRect(cx-25,base+8,25,14);
      });

      particles.forEach(p => {
        p.x+=p.vx; p.y+=p.vy; p.life+=0.005;
        if (p.y<0||p.life>1) { p.x=Math.random()*W; p.y=H*0.62; p.life=0; p.vy=-(Math.random()*0.3+0.1); p.vx=(Math.random()-0.5)*0.4; }
        const a = Math.sin(p.life*Math.PI)*0.7;
        ctx.beginPath(); ctx.arc(p.x,p.y,2,0,Math.PI*2);
        ctx.fillStyle=p.color+Math.floor(a*255).toString(16).padStart(2,'0'); ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',display:'block'}}/>;
}
