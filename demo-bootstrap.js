// Suggestions only: never automatically subscribe or submit a visitor's feed list.
(() => {
  async function loadSeeds(){try{
    const response=await fetch("samples/seed-blogs.json");if(!response.ok)return;
    const seeds=await response.json();if(!Array.isArray(seeds)||seeds.length<10||recommendations.some(item=>item.provenance==="aggregate"))return;
    recommendations=seeds.map(seed=>({...seed,provenance:"editorial"}));renderDiscover();
  }catch{/* Existing starter cards remain usable offline. */}}
  if(window.quietReaderReady)loadSeeds();else window.addEventListener("quiet-reader-ready",loadSeeds,{once:true});
})();
