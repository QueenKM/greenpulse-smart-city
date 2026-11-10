"""Create the licensed Leuven geometry snapshot from a local OSM API XML extract.

Usage: python scripts/build-city-model.py /path/to/leuven-osm.xml
The input may be merged adjoining small OSM API extracts. No geometry is invented.
"""
import json, math, re, sys, xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

BBOX = [4.686, 50.872, 4.716, 50.886]
WEST, SOUTH, EAST, NORTH = BBOX
root = ET.parse(sys.argv[1]).getroot()
nodes = {n.get('id'): [round(float(n.get('lon')), 7), round(float(n.get('lat')), 7)] for n in root.findall('node')}
ways = {w.get('id'): w for w in root.findall('way')}
def tags(e): return {t.get('k'): t.get('v') for t in e.findall('tag')}
def name(t): return t.get('name:en') or t.get('name') or ''
def refs(w): return [n.get('ref') for n in w.findall('nd')]
def geometry(ids): return [nodes[i] for i in ids if i in nodes]
def contains(p): return WEST <= p[0] <= EAST and SOUTH <= p[1] <= NORTH
def inside(points): return any(contains(p) for p in points)
def number(value):
    if not value: return None
    match = re.match(r'^\s*(\d+(?:[.,]\d+)?)\s*(?:m|metres|meters)?\s*$', value)
    return round(float(match.group(1).replace(',', '.')), 2) if match else None
def area(points):
    if len(points) < 3: return 0
    xscale=111320*math.cos(math.radians(50.8795));yscale=111320
    pts=[((p[0]-4.7)*xscale,(p[1]-50.88)*yscale) for p in points]
    return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(pts,pts[1:]+pts[:1])))/2

def point_in_polygon(p, ring):
    x,y=p;result=False
    for a,b in zip(ring,ring[1:]+ring[:1]):
        if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:result=not result
    return result

def join_rings(chains):
    pending=[list(c) for c in chains if len(c)>1];rings=[]
    while pending:
        ring=pending.pop(0)
        while ring[0]!=ring[-1]:
            found=False
            for i,c in enumerate(pending):
                if c[0]==ring[-1]:ring+=c[1:]
                elif c[-1]==ring[-1]:ring+=list(reversed(c[:-1]))
                elif c[-1]==ring[0]:ring=c[:-1]+ring
                elif c[0]==ring[0]:ring=list(reversed(c[1:]))+ring
                else:continue
                pending.pop(i);found=True;break
            if not found:break
        if ring[0]==ring[-1]:rings.append(ring)
    return rings

polygons=[];claimed=set()
for rel in root.findall('relation'):
    t=tags(rel)
    if t.get('type')!='multipolygon':continue
    if not any(k in t for k in ['building','building:part','natural','landuse','leisure','historic']):continue
    outer=[];inner=[];members=[]
    for m in rel.findall('member'):
        if m.get('type')!='way' or m.get('ref') not in ways:continue
        ids=refs(ways[m.get('ref')]);members.append(m.get('ref'))
        (inner if m.get('role')=='inner' else outer).append(ids)
    holes=[geometry(ids) for ids in join_rings(inner)]
    for i,ids in enumerate(join_rings(outer)):
        p=geometry(ids)
        if len(p)<4 or not inside(p):continue
        polygons.append((f'relation/{rel.get("id")}/{i}',t,p,[h for h in holes if h and point_in_polygon(h[0],p)]))
        claimed.update(members)
for wid,w in ways.items():
    ids=refs(w);p=geometry(ids)
    if wid not in claimed and len(ids)>3 and ids[0]==ids[-1] and len(p)==len(ids) and inside(p):
        polygons.append((f'way/{wid}',tags(w),p,[]))

model={'metadata':{
    'city':'Leuven','cityLabel':'LEUVEN','country':'Belgium','source':'OpenStreetMap',
    'capturedAt':datetime.now(timezone.utc).isoformat(),'bbox':BBOX,'center':[4.7009,50.8795],
    'attribution':'© OpenStreetMap contributors','license':'ODbL 1.0',
    'licenseUrl':'https://opendatacommons.org/licenses/odbl/1-0/',
    'sourceUrl':'https://www.openstreetmap.org/#map=16/50.8795/4.7009',
    'downloadUrl':'data/leuven-urban-model.json',
    'geographyStatement':'Street geometry and building footprints are derived from OpenStreetMap.',
    'operationalStatement':'Illustrative operational scenario. Synthetic demonstration data. Sensor locations, incidents, heat zones and scenario results are not real Leuven operational data.',
    'heightStatement':'Only explicit mapped height values are extruded. Building levels are retained as source attributes; untagged buildings remain footprints. Not a surveyed or calibrated 3D city model.',
    'heritageStatement':'Mapped historic sites are shown as reference features, not as an authoritative legal protection boundary.'
},'roads':[],'buildings':[],'greens':[],'water':[],'landmarks':[],'heritage':[]}
for wid,w in ways.items():
    t=tags(w);p=geometry(refs(w))
    if len(p)<2 or not inside(p):continue
    if 'highway' in t and t['highway'] not in ['proposed','construction','platform','elevator']:
        model['roads'].append({'id':f'way/{wid}','name':name(t),'kind':t['highway'],'points':p,
            'pedestrian':t['highway'] in ['pedestrian','footway','steps','path','cycleway'],
            'access':t.get('access'),'motorVehicle':t.get('motor_vehicle') or t.get('vehicle'),
            'oneway':t.get('oneway')=='yes'})
    if t.get('waterway') in ['river','stream','canal']:
        model['water'].append({'id':f'way/{wid}','name':name(t),'points':p,'kind':'line','waterway':t['waterway']})
for fid,t,p,holes in polygons:
    base={'id':fid,'name':name(t),'points':p}
    if holes:base['holes']=holes
    if t.get('building') not in [None,'no'] or t.get('building:part') not in [None,'no']:
        if area(p)>=5:
            model['buildings'].append({**base,'height':number(t.get('height')),'levels':number(t.get('building:levels')),'kind':t.get('building','part')})
    if t.get('leisure') in ['park','garden','nature_reserve','recreation_ground'] or t.get('landuse') in ['grass','forest','recreation_ground','meadow'] or t.get('natural') in ['wood','scrub','grassland']:
        if area(p)>20:model['greens'].append(base)
    if t.get('natural')=='water' or t.get('waterway')=='riverbank':model['water'].append({**base,'kind':'polygon'})
    if (t.get('historic') and t.get('historic')!='no') or t.get('heritage') not in [None,'no']:
        model['heritage'].append({**base,'kind':t.get('historic','mapped_heritage')})

landmarks=[]
for e in [*root.findall('node'),*ways.values(),*root.findall('relation')]:
    t=tags(e)
    if not name(t):continue
    if e.tag=='node':point=nodes.get(e.get('id'))
    elif e.tag=='way':
        pts=geometry(refs(e));point=[sum(p[0] for p in pts)/len(pts),sum(p[1] for p in pts)/len(pts)] if pts else None
    else:continue
    if point and contains(point) and (t.get('historic') or t.get('tourism') in ['museum','attraction'] or t.get('amenity') in ['townhall','place_of_worship','university','library'] or t.get('leisure') in ['park','garden']):
        landmarks.append({'id':f'{e.tag}/{e.get("id")}','name':name(t),'point':[round(v,7) for v in point],'kind':t.get('historic') or t.get('tourism') or t.get('amenity') or t.get('leisure')})
for fid,t,pts,holes in polygons:
    if name(t) and (t.get('historic') or t.get('heritage') or t.get('tourism') in ['museum','attraction'] or t.get('amenity') in ['townhall','place_of_worship','university','library']):
        point=[sum(p[0] for p in pts)/len(pts),sum(p[1] for p in pts)/len(pts)]
        if contains(point):landmarks.append({'id':fid,'name':name(t),'point':[round(v,7) for v in point],'kind':t.get('historic') or t.get('tourism') or t.get('amenity') or 'mapped_heritage'})
seen=set()
for l in sorted(landmarks,key=lambda l:0 if any(n in l['name'].lower() for n in ['stadhuis','pieters','kruidtuin','donatus','universiteitsbibliotheek','begijnhof','geertrui','mark']) else 1):
    if l['name'] not in seen:model['landmarks'].append(l);seen.add(l['name'])
model['metadata']['counts']={k:len(model[k]) for k in ['roads','buildings','greens','water','landmarks','heritage']}
model['metadata']['counts']['mappedHeights']=sum(1 for b in model['buildings'] if b['height'] is not None)
model['metadata']['counts']['mappedLevels']=sum(1 for b in model['buildings'] if b['levels'] is not None)
project=Path(__file__).resolve().parents[1]
text=json.dumps(model,ensure_ascii=False,separators=(',',':'))
for target in ['src/data/city-model.json','public/data/leuven-urban-model.json']:
    p=project/target;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text+'\n')
print(json.dumps({'counts':model['metadata']['counts'],'bytes':len(text.encode()),'bbox':BBOX},indent=2))
print('Named landmarks:',[l['name'] for l in model['landmarks'][:18]])
