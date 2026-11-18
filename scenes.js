/* ===== DÉCORS (fond de scène, aria-hidden, jamais cliquables) ===== */
const SV=(b,inner,al='xMidYMax')=>`<svg class="scn" viewBox="0 0 360 ${b}" preserveAspectRatio="${al} slice" aria-hidden="true" focusable="false">${inner}</svg>`;
const SCENES={
lanterne:SV(520,`<defs><linearGradient id="gL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1638"/><stop offset=".62" stop-color="#26397A"/></linearGradient></defs><rect width="360" height="520" fill="url(#gL)"/><g fill="#C9D6F2" opacity=".5"><circle cx="40" cy="60" r="1.5"/><circle cx="120" cy="30" r="1"/><circle cx="200" cy="90" r="1.5"/><circle cx="330" cy="150" r="1"/><circle cx="80" cy="170" r="1"/></g><circle cx="282" cy="82" r="28" fill="#FFF4D6"/><circle cx="294" cy="74" r="26" fill="#1A2A5E"/><path d="M0 312Q70 270 140 300T270 288T360 300V330H0Z" fill="#17285C"/><rect y="324" width="360" height="200" fill="#10204F"/><g class="sc-shim" stroke="#FFF4D6" stroke-width="3" stroke-linecap="round" opacity=".45"><path d="M262 346h28M254 364h40M266 382h18M258 400h30"/></g><path d="M0 432L360 412V520H0Z" fill="#5A3B2A"/><g stroke="#3B2619" stroke-width="3"><path d="M0 452L360 434M0 476L360 460M0 500L360 488"/></g><g fill="#3B2619"><rect x="24" y="398" width="16" height="62" rx="5"/><rect x="318" y="384" width="16" height="62" rx="5"/></g><path d="M32 402Q180 440 326 388" stroke="#C9A06A" stroke-width="3" fill="none"/>`),
bateaux:SV(520,`<defs><linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ED8F0"/><stop offset="1" stop-color="#E9F7F6"/></linearGradient></defs><rect width="360" height="200" fill="url(#gB)"/><circle cx="70" cy="70" r="30" fill="#FFD27A"/><g fill="#fff" opacity=".9"><ellipse cx="250" cy="60" rx="40" ry="12"/><ellipse cx="280" cy="50" rx="24" ry="14"/></g><path d="M0 190Q90 182 180 190T360 190V520H0Z" fill="#2E8FB0"/><g class="sc-wave"><path d="M-60 260q30-14 60 0t60 0 60 0 60 0 60 0 60 0 60 0 60 0V520H-60Z" fill="#2581A3"/></g><g class="sc-wave sc-w2"><path d="M-60 360q30-16 60 0t60 0 60 0 60 0 60 0 60 0 60 0 60 0V520H-60Z" fill="#1B6F8A"/></g><g class="sc-wave sc-w3"><path d="M-60 450q30-16 60 0t60 0 60 0 60 0 60 0 60 0 60 0 60 0V520H-60Z" fill="#155A72"/></g><g class="sc-bob"><path d="M312 232h16l-4 18h-8z" fill="#FF7A6B"/><rect x="318" y="214" width="4" height="18" fill="#13224A"/></g>`),
vent:SV(520,`<rect width="360" height="520" fill="#BFE6EA"/><g class="sc-cloud" fill="#fff"><ellipse cx="80" cy="80" rx="46" ry="14"/><ellipse cx="104" cy="70" rx="26" ry="14"/><ellipse cx="280" cy="150" rx="40" ry="12"/></g><g class="sc-gust" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"><path d="M20 220q60-10 120 0"/><path d="M200 260q60-10 140 0"/></g><path d="M0 420Q120 380 230 400T360 380V520H0Z" fill="#7FBF8A"/><path d="M0 460Q140 430 360 450V520H0Z" fill="#5C9E6E"/><rect x="292" y="330" width="5" height="70" fill="#13224A"/><path class="sc-sock" d="M297 332l46 6-4 6 4 6-46 4z" fill="#FF7A6B" stroke="#13224A" stroke-width="2"/>`),
constellation:SV(520,`<defs><radialGradient id="gC" cx=".5" cy=".9" r=".9"><stop offset="0" stop-color="#2A3C84"/><stop offset="1" stop-color="#0A1434"/></radialGradient></defs><rect width="360" height="520" fill="url(#gC)"/><path d="M-20 120Q180 260 380 160" stroke="#8C9BE0" stroke-width="70" opacity=".08" fill="none"/><g class="sc-twk" fill="#C9D6F2"><circle cx="30" cy="40" r="1"/><circle cx="95" cy="130" r=".8"/><circle cx="160" cy="60" r="1"/><circle cx="250" cy="25" r=".8"/><circle cx="330" cy="100" r="1"/><circle cx="300" cy="230" r=".8"/><circle cx="60" cy="300" r=".8"/></g><path d="M0 470Q60 440 120 456L170 448Q250 430 360 462V520H0Z" fill="#070F28"/><rect x="246" y="396" width="12" height="44" fill="#070F28"/><path d="M243 396h18l-4-10h-10z" fill="#070F28"/><circle cx="252" cy="392" r="3" fill="#FFB23E"/>`),
gue:SV(520,`<rect width="360" height="520" fill="#3E8E5E"/><path d="M60 0C40 120 90 200 60 300S80 450 50 520H310C330 420 280 330 300 220S270 80 300 0Z" fill="#4FA9C4"/><path d="M60 0C40 120 90 200 60 300S80 450 50 520" stroke="#E4C98F" stroke-width="10" fill="none"/><path d="M300 0C270 80 320 120 300 220S330 420 310 520" stroke="#E4C98F" stroke-width="10" fill="none"/><g class="sc-flow" stroke="#E6F7FA" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 40" fill="none" opacity=".7"><path d="M120 0C110 180 140 330 120 520"/><path d="M180 0C190 160 160 340 185 520"/><path d="M240 0C230 170 255 350 240 520"/></g><g fill="#2F7A4C"><circle cx="20" cy="80" r="16"/><circle cx="340" cy="140" r="14"/><circle cx="24" cy="380" r="18"/><circle cx="338" cy="440" r="16"/></g>`),
lucioles:SV(520,`<defs><linearGradient id="gF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1B42"/><stop offset="1" stop-color="#173A3A"/></linearGradient></defs><rect width="360" height="520" fill="url(#gF)"/><path d="M0 120Q180 90 360 130" stroke="#1D3D60" stroke-width="40" opacity=".5" fill="none"/><g stroke="#0B2424" stroke-width="5" stroke-linecap="round" fill="none"><path d="M14 520q4-80-6-130M30 520q-2-70 14-110M330 520q6-90-10-140M346 520q-4-60 8-100M180 520q2-40-6-70"/></g><path d="M0 490Q180 470 360 490V520H0Z" fill="#0B2424"/>`),
phares:SV(520,`<rect width="360" height="520" fill="#CFE8EC"/><g stroke="#9CC9D2" stroke-width="1.5" fill="none"><path d="M0 120H360M0 260H360M0 400H360M90 0V520M180 0V520M270 0V520"/></g><g stroke="#7FB4C0" stroke-width="1" opacity=".7"><path d="M60 460L330 70M40 90L340 470"/></g><g transform="translate(300 460)" stroke="#5E8F9B" stroke-width="2" fill="none"><circle r="34"/><circle r="24" stroke-dasharray="3 4"/><path d="M0-42L6 0 0 42-6 0Z" fill="#5E8F9B" stroke="none"/><path d="M-42 0L0 5 42 0 0-5Z" fill="#9CC9D2" stroke="none"/></g><text x="300" y="412" font-size="12" text-anchor="middle" fill="#3D5A80" font-family="sans-serif">N</text>`,'xMidYMid'),
collier:SV(520,`<defs><pattern id="pS" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="4" cy="6" r="1.4" fill="#D9B276"/><circle cx="16" cy="18" r="1" fill="#C99E5E"/></pattern></defs><rect width="360" height="520" fill="#F2D29B"/><rect width="360" height="520" fill="url(#pS)"/><path d="M0 0H360V70Q270 96 180 74T0 84Z" fill="#4FC3C9"/><path class="sc-foam" d="M0 84Q90 64 180 74T360 70" stroke="#F7FBFA" stroke-width="6" fill="none" stroke-linecap="round"/><g fill="#E9A88C" stroke="#B5704F" stroke-width="2"><path d="M40 470q12-24 24 0z"/><path d="M300 440q14-26 28 0z"/></g><circle cx="320" cy="140" r="5" fill="#F7FBFA" stroke="#C99E5E" stroke-width="2"/>`,'xMidYMid'),
recif:SV(520,`<rect width="360" height="520" fill="#2FB3BC"/><g class="sc-caus" fill="none" stroke="#9FE7E5" stroke-width="3" opacity=".35"><path d="M0 60q40 20 80 0t80 10 80-10 120 10M0 200q50-20 100 0t90 10 90-10 80 0M0 340q40 20 90 0t90 0 90 10 90-10"/></g><g fill="#FF7A6B"><path d="M20 520v-50q-14-10-6-24 10 8 14 20 4-26 18-28 6 16-8 34v48z"/></g><g fill="#9C8CF5"><path d="M300 520c-6-30 8-50 4-70 14 10 10 30 20 30s4-30 18-34c2 26-14 40-6 74z"/></g><g fill="#F2D29B"><ellipse cx="180" cy="512" rx="200" ry="20"/></g>`),
courants:SV(520,`<defs><pattern id="pW" width="40" height="20" patternUnits="userSpaceOnUse"><path d="M0 10q10-6 20 0t20 0" stroke="#2A6F9E" stroke-width="2" fill="none"/></pattern></defs><rect width="360" height="520" fill="#1D4E7A"/><rect class="sc-drift" x="-40" width="440" height="520" fill="url(#pW)" opacity=".6"/><g fill="none" stroke="#F2D29B" stroke-width="2" opacity=".35"><circle cx="40" cy="40" r="60"/><circle cx="330" cy="500" r="70"/></g>`,'xMidYMid'),
cabines:SV(520,`<defs><linearGradient id="gK" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE3B8"/><stop offset="1" stop-color="#BFE6EA"/></linearGradient></defs><rect width="360" height="170" fill="url(#gK)"/><circle cx="290" cy="70" r="26" fill="#FFB23E"/><rect y="160" width="360" height="60" fill="#2E8FB0"/><path class="sc-foam" d="M0 220Q90 208 180 218T360 214" stroke="#F7FBFA" stroke-width="6" fill="none"/><rect y="218" width="360" height="302" fill="#F2D29B"/><g fill="#E0BA7A"><ellipse cx="60" cy="300" rx="5" ry="8"/><ellipse cx="74" cy="320" rx="5" ry="8"/><ellipse cx="62" cy="344" rx="5" ry="8"/><ellipse cx="78" cy="366" rx="5" ry="8"/></g><g transform="translate(300 420)"><path d="M0 0V70" stroke="#13224A" stroke-width="4"/><path d="M-40 6Q0-30 40 6Z" fill="#FF7A6B"/><path d="M-14 6Q0-30 14 6Z" fill="#F7FBFA"/></g>`),
mouettes:SV(520,`<rect width="360" height="520" fill="#DCEFF2"/><g class="sc-cloud" fill="#fff"><ellipse cx="90" cy="70" rx="40" ry="12"/><ellipse cx="270" cy="120" rx="34" ry="10"/></g><g class="sc-glide" stroke="#3D5A80" stroke-width="3" fill="none" stroke-linecap="round"><path d="M200 60q8-8 14 0q6-8 14 0"/><path d="M60 150q6-6 11 0q5-6 11 0"/></g><rect y="300" width="360" height="220" fill="#5BB8F0"/><g class="sc-shim" stroke="#F7FBFA" stroke-width="3" opacity=".6" stroke-linecap="round"><path d="M30 330h40M210 350h50M120 380h30"/></g><path d="M0 420H360V520H0Z" fill="#9A6A48"/><g stroke="#6E4A31" stroke-width="3"><path d="M0 444H360M0 470H360M0 496H360"/></g><g fill="#6E4A31"><rect x="20" y="390" width="14" height="40" rx="4"/><rect x="326" y="390" width="14" height="40" rx="4"/></g>`)
};
const scene=id=>`<div class="scene-bg">${SCENES[id]||''}</div>`;

/* ===== MASCOTTE « Mèche » ===== */
const MECHE=`<svg class="mascot" data-mood="neutral" viewBox="0 0 120 120" role="img" aria-label="Mèche, la luciole">
<circle class="m-glow" cx="60" cy="96" r="30" fill="#FFB23E" opacity=".3"/>
<g class="m-wings" fill="#DDF3F7" stroke="#13224A" stroke-width="3" opacity=".95"><ellipse cx="30" cy="44" rx="20" ry="12" transform="rotate(-30 30 44)"/><ellipse cx="90" cy="44" rx="20" ry="12" transform="rotate(30 90 44)"/></g>
<ellipse cx="60" cy="96" rx="22" ry="18" fill="#FFB23E" stroke="#13224A" stroke-width="4"/>
<path d="M44 92q16 6 32 0" stroke="#E08A1E" stroke-width="3" fill="none"/>
<g stroke="#13224A" stroke-width="4" stroke-linecap="round" fill="none"><path d="M48 24Q40 8 30 10"/><path d="M72 24Q80 8 90 10"/></g>
<circle cx="30" cy="10" r="5" fill="#FFB23E" stroke="#13224A" stroke-width="3"/><circle cx="90" cy="10" r="5" fill="#FFB23E" stroke="#13224A" stroke-width="3"/>
<circle cx="60" cy="54" r="32" fill="#2B4590" stroke="#13224A" stroke-width="4"/>
<g fill="#FF7A6B" opacity=".75"><ellipse cx="38" cy="66" rx="6" ry="4"/><ellipse cx="82" cy="66" rx="6" ry="4"/></g>
<g class="mf mf-n"><ellipse cx="48" cy="52" rx="7" ry="9" fill="#fff"/><ellipse cx="72" cy="52" rx="7" ry="9" fill="#fff"/><circle cx="49" cy="55" r="4" fill="#13224A"/><circle cx="73" cy="55" r="4" fill="#13224A"/><path d="M52 68q8 6 16 0" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/></g>
<g class="mf mf-h"><path d="M41 55q7-10 14 0M65 55q7-10 14 0" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M49 64h22q-2 13-11 13t-11-13z" fill="#13224A" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><path d="M55 73q5-4 10 0" fill="#FF7A6B"/></g>
<g class="mf mf-s"><circle cx="47" cy="50" r="9" fill="#fff"/><circle cx="73" cy="50" r="9" fill="#fff"/><circle cx="47" cy="51" r="3.5" fill="#13224A"/><circle cx="73" cy="51" r="3.5" fill="#13224A"/><path d="M38 36l12-3M82 36l-12-3" stroke="#fff" stroke-width="3" stroke-linecap="round"/><ellipse cx="60" cy="71" rx="5" ry="6.5" fill="#13224A" stroke="#fff" stroke-width="2.5"/></g>
</svg>`;
function mood(el,m,ms){if(!el)return;el.dataset.mood=m;if(ms){clearTimeout(el._t);el._t=setTimeout(()=>el.dataset.mood='neutral',ms);}}

/* ===== ÉTOILES & MÉDAILLES ===== */
const STAR_P='M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z';
const starsOf=s=>s>=85?3:s>=65?2:s>=40?1:0;
const starsHTML=(n,big)=>`<div class="stars3${big?' big':''}" role="img" aria-label="${n} étoile${n>1?'s':''} sur 3">${[0,1,2].map(i=>`<svg viewBox="0 0 24 24" class="${i<n?'on':''}" style="--i:${i}"><path d="${STAR_P}"/></svg>`).join('')}</div>`;
const MEDALS={or:['#FFD45C','#C98A12','Médaille d’or'],argent:['#E3E9F2','#8A97AD','Médaille d’argent'],bronze:['#E9A46A','#9A5A2A','Médaille de bronze']};
const medalOf=t=>t>=80?'or':t>=60?'argent':t>=40?'bronze':null;
function medalSVG(k){const[a,b,l]=MEDALS[k];return `<svg class="medal" viewBox="0 0 120 150" role="img" aria-label="${l}"><path d="M34 0h22l14 46H48zM86 0H64L50 46h22z" fill="#FF7A6B" stroke="#13224A" stroke-width="3" stroke-linejoin="round"/><path d="M45 0h8l12 46h-8z" fill="#F7FBFA"/><circle cx="60" cy="96" r="46" fill="${b}" stroke="#13224A" stroke-width="4"/><circle cx="60" cy="96" r="36" fill="${a}"/><g fill="${b}"><path d="M54 120l2-30h8l2 30z"/><path d="M52 90h16l-3-8H55z"/><circle cx="60" cy="78" r="5"/></g><path d="M66 78l20-8v16z" fill="#fff" opacity=".8"/><path class="medal-shine" d="M30 70l20-20 8 8-20 20z" fill="#fff" opacity=".45"/></svg>`;}

/* ===== CONFETTIS ===== */
function confetti(n=36){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const box=document.createElement('div');box.className='confetti';box.setAttribute('aria-hidden','true');
  const C=['#FFB23E','#FF7A6B','#4FC3C9','#F7FBFA','#9C8CF5','#7FD6A8'];
  for(let i=0;i<n;i++){const s=document.createElement('i'),R=Math.random;
    s.style.cssText=`--x:${(R()*2-1)*48}vw;--y:${-(35+R()*40)}vh;--r:${(R()*2-1)*540}deg;--d:${1100+R()*700|0}ms;--c:${C[i%C.length]};animation-delay:${R()*120|0}ms${i%3?'':';border-radius:50%;width:9px;height:9px'}`;
    box.appendChild(s);}
  document.body.appendChild(box);setTimeout(()=>box.remove(),2100);
}

/* ===== SONS (WebAudio, aucun fichier) ===== */
const SFX=(()=>{let ac,out;
  const init=()=>{if(!ac){ac=new(window.AudioContext||window.webkitAudioContext)();
    const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=4500;
    out=ac.createGain();out.gain.value=.9;out.connect(lp);lp.connect(ac.destination);}
    if(ac.state==='suspended')ac.resume();return ac;};
  // f:Hz, t:décalage s, d:durée s, w:forme, v:volume crête, f2:glissando vers, vib:vibrato Hz
  const tone=(f,t=0,d=.15,w='sine',v=.07,f2=0,vib=0)=>{const a=init(),T=a.currentTime+.01+t,o=a.createOscillator(),g=a.createGain();
    o.type=w;o.frequency.setValueAtTime(f,T);if(f2)o.frequency.exponentialRampToValueAtTime(f2,T+d*.8);
    if(vib){const l=a.createOscillator(),lg=a.createGain();l.frequency.value=vib;lg.gain.value=f*.012;l.connect(lg);lg.connect(o.frequency);l.start(T);l.stop(T+d+.05);}
    g.gain.setValueAtTime(0,T);g.gain.linearRampToValueAtTime(v,T+.006);g.gain.exponentialRampToValueAtTime(.0001,T+d);
    o.connect(g);g.connect(out);o.start(T);o.stop(T+d+.05);};
  const mallet=(f,t,d,v)=>{tone(f,t,d,'sine',v);tone(f*4,t,d*.25,'sine',v*.18);}; // timbre « marimba »
  const S={
    tap:()=>tone(620,0,.07,'triangle',.05,420),
    ok:()=>{mallet(1047,0,.22,.07);mallet(1568,.07,.32,.07);},
    ko:()=>{tone(220,0,.24,'triangle',.08,150);tone(110,0,.2,'sine',.05);},
    count:n=>n>0?mallet(659,0,.16,.06):mallet(988,0,.4,.08),
    end:()=>[523,659,784,1047].forEach((f,i)=>mallet(f,i*.09,i<3?.22:.6,.06)),
    record:()=>{[784,988,1175,1568].forEach((f,i)=>mallet(f,i*.08,.26,.06));tone(1568,.34,.9,'sine',.045,0,6);tone(2093,.36,.7,'sine',.02,0,6);}
  };
  return (name,arg)=>{if(typeof settings!=='undefined'&&!settings.sound)return;try{S[name]&&S[name](arg);}catch(e){}};
})();

/* ===== FEEDBACK : anneau + vignette (pas de pseudo-élément → aucun conflit) ===== */
function burst(el,ok){
  if(!el||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const r=el.getBoundingClientRect(),z=Math.min(160,Math.max(r.width,r.height)),d=document.createElement('div');
  d.className='burst'+(ok?'':' ko');d.style.cssText=`left:${r.left+r.width/2}px;top:${r.top+r.height/2}px;width:${z}px;height:${z}px`;
  document.body.appendChild(d);setTimeout(()=>d.remove(),500);
  if(!ok){const v=document.createElement('div');v.className='flash-ko';document.body.appendChild(v);setTimeout(()=>v.remove(),420);}
}
