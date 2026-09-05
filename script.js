const $ = (id) => document.getElementById(id);
const state = {
  unit: localStorage.getItem('atmosphere-unit') || 'c',
  city: { name: 'New Delhi', admin1: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.209 },
  weather: null,
  saved: JSON.parse(localStorage.getItem('atmosphere-cities') || 'null') || [
    { name: 'New Delhi', admin1: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.209 },
    { name: 'Mumbai', admin1: 'Maharashtra', country: 'India', latitude: 19.076, longitude: 72.8777 },
    { name: 'Bengaluru', admin1: 'Karnataka', country: 'India', latitude: 12.9716, longitude: 77.5946 }
  ]
};

const weatherCodes = {
  0:['Clear sky','☀','clear'],1:['Mainly clear','🌤','clear'],2:['Partly cloudy','⛅','cloud'],3:['Overcast','☁','cloud'],
  45:['Foggy','🌫','cloud'],48:['Rime fog','🌫','cloud'],51:['Light drizzle','🌦','rain'],53:['Drizzle','🌦','rain'],55:['Heavy drizzle','🌧','rain'],
  56:['Freezing drizzle','🌧','rain'],57:['Freezing drizzle','🌧','rain'],61:['Light rain','🌦','rain'],63:['Rain','🌧','rain'],65:['Heavy rain','🌧','rain'],
  66:['Freezing rain','🌧','rain'],67:['Heavy freezing rain','🌧','rain'],71:['Light snow','🌨','snow'],73:['Snowfall','🌨','snow'],75:['Heavy snowfall','❄','snow'],
  77:['Snow grains','❄','snow'],80:['Rain showers','🌦','rain'],81:['Rain showers','🌧','rain'],82:['Heavy showers','⛈','storm'],85:['Snow showers','🌨','snow'],
  86:['Heavy snow showers','❄','snow'],95:['Thunderstorm','⛈','storm'],96:['Thunderstorm with hail','⛈','storm'],99:['Severe hailstorm','⛈','storm']
};

const fmtTemp = (c, suffix = false) => {
  if (c == null || Number.isNaN(c)) return '--';
  const value = state.unit === 'f' ? c * 9 / 5 + 32 : c;
  return `${Math.round(value)}${suffix ? '°' : ''}`;
};
const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}) : '--:--';
const dayName = (iso, i) => i === 0 ? 'Today' : new Date(`${iso}T12:00:00`).toLocaleDateString([], {weekday:'short'});
const codeInfo = (code, isDay = 1) => {
  const info = weatherCodes[code] || ['Variable weather','⛅','cloud'];
  if (!isDay && [0,1].includes(code)) return [info[0], '☾', 'night'];
  return info;
};
const clamp = (v,min,max) => Math.min(max,Math.max(min,v));

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $('toast').classList.remove('show'), 2600);
}

function setLoading(on) {
  $('liveDot').style.background = on ? '#ffd166' : '#50e29b';
  $('liveDot').style.boxShadow = `0 0 12px ${on ? '#ffd166' : '#50e29b'}`;
  if (on) $('condition').textContent = 'Updating conditions…';
}

async function getWeather(city) {
  setLoading(true);
  state.city = city;
  try {
    const params = new URLSearchParams({
      latitude: city.latitude, longitude: city.longitude, timezone: 'auto', forecast_days: '8',
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max'
    });
    const airParams = new URLSearchParams({latitude:city.latitude,longitude:city.longitude,timezone:'auto',current:'european_aqi,pm10,pm2_5'});
    const [forecastRes, airRes] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?${params}`),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${airParams}`)
    ]);
    if (!forecastRes.ok) throw new Error('Forecast unavailable');
    const forecast = await forecastRes.json();
    const air = airRes.ok ? await airRes.json() : {current:{}};
    state.weather = {...forecast, air:air.current || {}};
    renderAll();
    updateSavedWeather(city, forecast.current.temperature_2m, forecast.current.weather_code);
  } catch (error) {
    console.error(error);
    toast('Could not load live weather. Please try another city.');
    $('condition').textContent = 'Weather unavailable';
  } finally { setLoading(false); }
}

function renderAll() {
  const w = state.weather, c = w.current, d = w.daily;
  const info = codeInfo(c.weather_code, c.is_day);
  document.body.dataset.weather = info[2];
  $('cityName').textContent = state.city.name;
  $('regionName').textContent = [state.city.admin1,state.city.country].filter(Boolean).join(', ');
  $('temperature').textContent = fmtTemp(c.temperature_2m);
  $('condition').textContent = info[0];
  $('heroWeatherIcon').textContent = info[1];
  $('hiLow').textContent = `H: ${fmtTemp(d.temperature_2m_max[0],true)} · L: ${fmtTemp(d.temperature_2m_min[0],true)}`;
  $('weatherSummary').textContent = makeSummary(c,d);
  $('orbitHumidity').textContent = `${c.relative_humidity_2m}%`;
  $('orbitWind').textContent = `${Math.round(c.wind_speed_10m)} km/h`;
  $('localTime').textContent = `LOCAL TIME · ${fmtTime(c.time)}`;
  $('fullDate').textContent = new Date(`${d.time[0]}T12:00:00`).toLocaleDateString([], {weekday:'long',month:'long',day:'numeric'});
  $('forecastRange').textContent = `${new Date(d.time[0]).toLocaleDateString([],{month:'short',day:'numeric'})} — ${new Date(d.time[6]).toLocaleDateString([],{month:'short',day:'numeric'})}`;
  renderHourly(); renderDaily(); renderMetrics(); renderSaved(); updateSaveButton();
  $('lastUpdated').textContent = `Updated ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`;
}

function makeSummary(c,d) {
  const info = codeInfo(c.weather_code,c.is_day)[0].toLowerCase();
  const rain = d.precipitation_probability_max[0] || 0;
  const gust = Math.round(c.wind_gusts_10m || 0);
  if (rain >= 60) return `${info[0].toUpperCase()+info.slice(1)} with a ${rain}% chance of rain today. Wind gusts may reach ${gust} km/h.`;
  if (c.temperature_2m >= 34) return `${info[0].toUpperCase()+info.slice(1)} and notably warm. Stay hydrated during the hottest part of the day.`;
  return `${info[0].toUpperCase()+info.slice(1)} right now. Today's range is ${fmtTemp(d.temperature_2m_min[0],true)} to ${fmtTemp(d.temperature_2m_max[0],true)}, with gusts up to ${gust} km/h.`;
}

function renderHourly() {
  const h = state.weather.hourly;
  const currentStamp = new Date(state.weather.current.time).getTime();
  let start = h.time.findIndex(t => new Date(t).getTime() >= currentStamp);
  if (start < 0) start = 0;
  $('hourlyForecast').innerHTML = h.time.slice(start,start+24).map((time,i) => {
    const idx=start+i, info=codeInfo(h.weather_code[idx],h.is_day[idx]);
    return `<div class="hour-item ${i===0?'now':''}"><time>${i===0?'Now':fmtTime(time)}</time><span class="weather-glyph" title="${info[0]}">${info[1]}</span><strong>${fmtTemp(h.temperature_2m[idx],true)}</strong><small>${h.precipitation_probability[idx] ? `${h.precipitation_probability[idx]}% rain` : ''}</small></div>`;
  }).join('');
}

function renderDaily() {
  const d=state.weather.daily;
  const allMin=Math.min(...d.temperature_2m_min), allMax=Math.max(...d.temperature_2m_max), spread=Math.max(1,allMax-allMin);
  $('dailyForecast').innerHTML=d.time.slice(0,7).map((time,i)=>{
    const left=(d.temperature_2m_min[i]-allMin)/spread*56;
    const width=Math.max(18,(d.temperature_2m_max[i]-d.temperature_2m_min[i])/spread*80);
    const info=codeInfo(d.weather_code[i]);
    return `<div class="day-row"><strong>${dayName(time,i)}</strong><span class="weather-glyph" title="${info[0]}">${info[1]}</span><div class="temp-range"><span>${fmtTemp(d.temperature_2m_min[i],true)}</span><div class="range-bar"><i style="left:${left}%;width:${width}%"></i></div></div><span>${fmtTemp(d.temperature_2m_max[i],true)}</span></div>`;
  }).join('');
}

function renderMetrics() {
  const c=state.weather.current,d=state.weather.daily,a=state.weather.air;
  const aqi=Math.round(a.european_aqi ?? 0); const aq=aqiInfo(aqi);
  $('aqiValue').textContent=a.european_aqi==null?'—':aqi;
  $('aqiLabel').textContent=aq.label;$('aqiAdvice').textContent=aq.advice;
  $('aqiMarker').style.left=`${clamp(aqi/120*100,1,99)}%`;
  $('pm25').textContent=a.pm2_5==null?'—':`${Math.round(a.pm2_5)} µg/m³`;
  $('pm10').textContent=a.pm10==null?'—':`${Math.round(a.pm10)} µg/m³`;
  $('windSpeed').textContent=Math.round(c.wind_speed_10m);$('windGust').textContent=`${Math.round(c.wind_gusts_10m)} km/h`;
  $('windNeedle').style.transform=`rotate(${c.wind_direction_10m || 0}deg)`;
  $('sunrise').textContent=fmtTime(d.sunrise[0]);$('sunset').textContent=fmtTime(d.sunset[0]);
  const rise=new Date(d.sunrise[0]),set=new Date(d.sunset[0]),now=new Date(c.time); const daylight=(set-rise)/36e5;
  $('daylight').textContent=`${daylight.toFixed(1)} hours of daylight`;
  $('sunPosition').style.left=`${clamp((now-rise)/(set-rise)*100,0,98)}%`;
  $('feelsLike').textContent=fmtTemp(c.apparent_temperature,true);
  const delta=Math.round(c.apparent_temperature-c.temperature_2m);$('feelsNote').textContent=Math.abs(delta)<2?'Close to the actual temperature.':`Feels ${Math.abs(delta)}° ${delta>0?'warmer':'cooler'} than measured.`;
  $('humidity').textContent=`${c.relative_humidity_2m}%`;$('humidityMeter').style.width=`${c.relative_humidity_2m}%`;
  $('humidityNote').textContent=c.relative_humidity_2m>75?'The air feels quite humid.':c.relative_humidity_2m<35?'The air is relatively dry.':'Comfortable humidity level.';
  const uv=d.uv_index_max[0] ?? 0;$('uvIndex').textContent=uv.toFixed(1);$('uvLabel').textContent=uvLabel(uv);$('uvMarker').style.left=`${clamp(uv/12*100,1,99)}%`;
  const visibility=estimateVisibility(c.cloud_cover,c.relative_humidity_2m);$('visibility').textContent=`${visibility} km`;$('visibilityNote').textContent=visibility>15?'Excellent clarity.':visibility>8?'Good visibility.':'Reduced by current conditions.';
  $('pressure').textContent=Math.round(c.surface_pressure);$('precipitation').textContent=`${d.precipitation_sum[0].toFixed(1)} mm`;$('rainChance').textContent=`${d.precipitation_probability_max[0]}% chance today`;
}

function aqiInfo(v){if(v<=20)return{label:'Good',advice:'Clean air—an excellent time to be outdoors.'};if(v<=40)return{label:'Fair',advice:'Air quality is acceptable for most people.'};if(v<=60)return{label:'Moderate',advice:'Sensitive people may prefer lighter activity.'};if(v<=80)return{label:'Poor',advice:'Consider reducing prolonged outdoor activity.'};if(v<=100)return{label:'Very poor',advice:'Limit time outdoors, especially if sensitive.'};return{label:'Extremely poor',advice:'Avoid strenuous outdoor activity if possible.'}}
function uvLabel(v){return v<3?'Low exposure':v<6?'Moderate exposure':v<8?'High exposure':v<11?'Very high exposure':'Extreme exposure'}
function estimateVisibility(cloud,humidity){return Math.max(3,Math.round(28-cloud*.08-Math.max(0,humidity-70)*.35))}

async function searchCities(query) {
  if (query.trim().length < 2) { $('suggestions').hidden=true; return; }
  try {
    const res=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`);
    const data=await res.json();
    if(!data.results?.length){$('suggestions').innerHTML='<div class="suggestion"><span>No matching cities found</span></div>';$('suggestions').hidden=false;return}
    $('suggestions').innerHTML=data.results.map((city,i)=>`<button class="suggestion" role="option" data-index="${i}"><span>⌖</span><span><b>${city.name}</b><small>${[city.admin1,city.country].filter(Boolean).join(', ')}</small></span></button>`).join('');
    $('suggestions').hidden=false;
    [...$('suggestions').querySelectorAll('button')].forEach((button,i)=>button.onclick=()=>selectCity(data.results[i]));
  }catch(e){$('suggestions').hidden=true}
}

function selectCity(city){$('suggestions').hidden=true;$('citySearch').value='';getWeather({name:city.name,admin1:city.admin1||'',country:city.country||'',latitude:city.latitude,longitude:city.longitude})}
function sameCity(a,b){return Math.abs(a.latitude-b.latitude)<.01&&Math.abs(a.longitude-b.longitude)<.01}
function updateSaveButton(){const yes=state.saved.some(c=>sameCity(c,state.city));$('saveCity').textContent=yes?'♥':'♡';$('saveCity').classList.toggle('saved',yes)}
function saveCurrent(){const idx=state.saved.findIndex(c=>sameCity(c,state.city));if(idx>=0){state.saved.splice(idx,1);toast(`${state.city.name} removed from saved places`)}else{state.saved.unshift({...state.city,temp:state.weather?.current.temperature_2m,code:state.weather?.current.weather_code});state.saved=state.saved.slice(0,6);toast(`${state.city.name} saved`)}localStorage.setItem('atmosphere-cities',JSON.stringify(state.saved));renderSaved();updateSaveButton()}
function updateSavedWeather(city,temp,code){const found=state.saved.find(c=>sameCity(c,city));if(found){found.temp=temp;found.code=code;localStorage.setItem('atmosphere-cities',JSON.stringify(state.saved));renderSaved()}}
function renderSaved(){$('savedCities').innerHTML=state.saved.length?state.saved.map((city,i)=>`<button class="city-chip ${sameCity(city,state.city)?'active':''}" data-index="${i}"><strong>${city.name}</strong><span class="chip-temp">${city.temp==null?'·':fmtTemp(city.temp,true)}</span><small>${city.country||city.admin1||''}</small><small>${city.code==null?'Saved place':codeInfo(city.code)[0]}</small></button>`).join(''):'<p style="color:var(--muted);font-size:.78rem;padding:8px">Save a city to keep it close.</p>';[...$('savedCities').querySelectorAll('button')].forEach((b,i)=>b.onclick=()=>{getWeather(state.saved[i]);$('sidebar').classList.remove('open')})}

let searchTimer;$('citySearch').addEventListener('input',e=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>searchCities(e.target.value),280)});
$('searchForm').addEventListener('submit',e=>{e.preventDefault();const first=$('suggestions').querySelector('button');if(first)first.click();else searchCities($('citySearch').value)});
document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))$('suggestions').hidden=true});
$('saveCity').onclick=saveCurrent;
$('clearSaved').onclick=()=>{state.saved=[];localStorage.setItem('atmosphere-cities','[]');renderSaved();updateSaveButton();toast('Saved places cleared')};
$('mobileMenu').onclick=()=>{$('sidebar').classList.toggle('open')};
document.addEventListener('click',e=>{if(innerWidth<=800&&!e.target.closest('.sidebar')&&!e.target.closest('#mobileMenu'))$('sidebar').classList.remove('open')});
$('locationBtn').onclick=()=>{if(!navigator.geolocation)return toast('Location is not available in this browser.');$('locationBtn').querySelector('span:nth-child(2)').textContent='Finding you…';navigator.geolocation.getCurrentPosition(async pos=>{try{const {latitude,longitude}=pos.coords;const res=await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`);const data=await res.json();const c=data.results?.[0]||{name:'My location',latitude,longitude};getWeather({name:c.name||'My location',admin1:c.admin1||'',country:c.country||'',latitude,longitude})}catch{getWeather({name:'My location',admin1:'',country:'',latitude:pos.coords.latitude,longitude:pos.coords.longitude})}finally{$('locationBtn').querySelector('span:nth-child(2)').textContent='Use my location'}},()=>{$('locationBtn').querySelector('span:nth-child(2)').textContent='Use my location';toast('Location permission was not granted.')},{timeout:8000})};
document.querySelectorAll('[data-unit]').forEach(btn=>btn.onclick=()=>{state.unit=btn.dataset.unit;localStorage.setItem('atmosphere-unit',state.unit);document.querySelectorAll('[data-unit]').forEach(b=>b.classList.toggle('active',b===btn));if(state.weather)renderAll()});
document.querySelector(`[data-unit="${state.unit}"]`).classList.add('active');document.querySelectorAll('[data-unit]').forEach(b=>{if(b.dataset.unit!==state.unit)b.classList.remove('active')});
window.addEventListener('online',()=>{toast('Back online—refreshing weather');getWeather(state.city)});window.addEventListener('offline',()=>toast('You are offline. Showing the last view.'));
renderSaved();getWeather(state.city);
