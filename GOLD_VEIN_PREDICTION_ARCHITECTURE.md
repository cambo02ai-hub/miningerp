# Gold Veins & Mineral Deposit Prediction System
## System Architecture, Workflow, and Tech Stack Specification

ဤစာတမ်းသည် မြေပုံပေါ်တွင် ရွှေဓာတ်သတ္တုကြောများ (Gold Veins / Mineral Deposits) ကို ခန့်မှန်း visualization ပြသပေးနိုင်သည့် စနစ်၏ System Architecture၊ Recommended Tech Stack၊ Core Features နှင့် Development Workflow တို့ကို အသေးစိတ် ဖော်ပြထားခြင်း ဖြစ်သည်။

---

## 1. System Architecture (စနစ်၏ တည်ဆောက်ပုံ)

စနစ်အား **4-Tier Geospatial Architecture** ဖြင့် စနစ်တကျ တည်ဆောက်ထားပါသည်-

```
 +-----------------------------------------------------------------------+
 |                     1. Frontend Layer (User Interface)               |
 |  - React 19 + TypeScript + Tailwind CSS                               |
 |  - CesiumJS (3D Subsurface Visualizer) / Leaflet (2D Layer Control)    |
 |  - Interactive Layer Switcher (Satellite, Faults, Alteration, Heatmap)|
 |  - Drillhole (Collar/Survey/Assay) & Shapefile Upload Module          |
 +-----------------------------------+-----------------------------------+
                                     |
                                     v
 +-----------------------------------+-----------------------------------+
 |                   2. API & Spatial Processing Layer                   |
 |  - Java Spring Boot Gateway API (Authentication, RBAC, Core ERP)       |
 |  - Python FastAPI Geospatial Microservice (GeoPandas, GDAL, Shapely)    |
 |  - Machine Learning Predictive Engine (Scikit-Learn / PyTorch)        |
 +-----------------------------------+-----------------------------------+
                                     |
                                     v
 +-----------------------------------+-----------------------------------+
 |                   3. GIS Server & Tile Rendering Engine              |
 |  - GeoServer / Vector Tile Engine (MVT - Mapbox Vector Tiles)          |
 |  - Raster Tile Cache (COG - Cloud Optimized GeoTIFF)                   |
 +-----------------------------------+-----------------------------------+
                                     |
                                     v
 +-----------------------------------+-----------------------------------+
 |                   4. Database Layer (Geospatial Storage)             |
 |  - PostgreSQL 16 + PostGIS Extension                                  |
 |  - Spatial Indexes (GIST) for GeoJSON, Shapefile, Drillhole 3D Points |
 +-----------------------------------------------------------------------+
```

### Component Details
1. **Frontend Layer (UI):**
   - **Interactive Layer Controls:** Satellite View, Topography Contours, Geological Faults, Hyperspectral Alteration Zones (Argillic, Phyllic, Propylitic) toggles.
   - **Data Upload UI:** Drag-and-drop support for CSV (Collar, Survey, Assay) and GeoJSON / Shapefile (.shp).
   - **Visualization Panels:** 2D Gold Potential Heatmap with Probability Scale (0%-100%), 3D Subsurface Drillhole Depth Visualizer (-10m to -150m).

2. **Geospatial Backend & ML API:**
   - **Python FastAPI Service:** Handles heavy GIS operations using GDAL/OGR, Rasterio, and Shapely.
   - **Machine Learning Inference:** Random Forest / CNN model evaluating ASTER/Sentinel band ratios, alteration zones, and radiometric anomaly indices to generate probability maps.

3. **GIS Server & Map Tile Engine:**
   - Converts vector features into vector tiles (`.mvt`) and raster datasets into Cloud Optimized GeoTIFFs (COG) for instant map rendering.

4. **Geospatial Database (PostGIS):**
   - Stores spatial geometries (`PointZ`, `LineStringZ`, `PolygonZ`) with GIST indexing for fast spatial queries (e.g. `ST_DWithin`, `ST_Intersects`).

---

## 2. Recommended Tech Stack (အသုံးပြုထားသော နည်းပညာများ)

| အပိုင်း | နည်းပညာ / Tool | ဖော်ပြချက် |
| --- | --- | --- |
| **Frontend UI & Map** | **CesiumJS / WebGL & Leaflet** | 3D subterranean drillhole/vein geometry rendering နှင့် 2D interactive layer toggle ပြုလုပ်ရန် |
| **API Gateway** | **Java Spring Boot 3** | Authentication, Audit Logging, နှင့် Location/Pit CRUD operations |
| **Geospatial Microservice** | **Python (FastAPI)** | GDAL, GeoPandas, Rasterio သုံး၍ raster band math နှင့် spatial spatial join ပြုလုပ်ရန် |
| **Geospatial DB** | **PostgreSQL + PostGIS** | Spatial coordinate points, drillhole intervals, 3D polygons သိုလှောင်ရန် |
| **GIS Processing** | **GDAL, Rasterio, Shapely** | Band ratio calculation (ASTER/Sentinel) နှင့် Buffer/Interpolation တွက်ချက်ရန် |
| **ML Predictive Engine** | **Scikit-Learn / PyTorch** | Random Forest / CNN Classifier ဖြင့် ရွှေတွေ့နိုင်ခြေ ရာခိုင်နှုန်း (Probability Heatmap) တွက်ချက်ရန် |

---

## 3. Core Features & System Workflows

### 3.1 Interactive Map Layers Toggle
- **Satellite View:** High-resolution optical background view.
- **Topographical Contours:** Terrain elevation lines and slope steepness.
- **Geological Faults & Shear Zones:** Structural geological fault vectors.
- **Hyperspectral Alteration Zones:** Hydrothermal alteration mapping (Argillic, Phyllic, Propylitic zones indicating gold mineralization potential).

### 3.2 2D Gold Potential Heatmap Generator
- **ASTER / Sentinel Band Ratio Calculation:** (Band 4/Band 5 for Hydroxides, Band 7/Band 6 for Carbonate/Phyllic).
- **Probability Scale Legend:**
  - **High Potential (> 75%):** Crimson / Amber Heatmap overlay.
  - **Moderate Potential (45% - 75%):** Golden Yellow overlay.
  - **Low Potential (< 45%):** Cyan / Translucent overlay.

### 3.3 3D Geological Subsurface Visualizer
- **Subterranean Depth Grid:** Vertical slice visualization from 0m down to -150m AMSL.
- **Drillhole Trajectory Points:** Collar Coordinates (X, Y, Z), Survey (Azimuth, Dip), Assay Au Grade (g/t) intervals.
- **3D Vein Solids:** Wireframe and volumetric solid rendering of interpreted gold quartz veins.

### 3.4 Data Upload & Processing Module
- **CSV Data Ingestion:**
  - `Collar.csv` (Hole_ID, Lat, Lng, Elevation)
  - `Survey.csv` (Hole_ID, Depth, Dip, Azimuth)
  - `Assay.csv` (Hole_ID, From_m, To_m, Gold_Grade_gt)
- **Shapefile / GeoJSON Upload:** Directly overlay polygon geometries and update prediction heatmaps.

---

## 4. Development Implementation Phases

1. **Phase 1 (MVP - Interactive 2D Layers & CSV Upload):**
   - Leaflet/Mapbox 2D GIS map with layer toggling, CSV parsing, and default Pit/Vein features.
2. **Phase 2 (Spatial Backend & ML Potential Heatmap):**
   - PostGIS spatial schema integration and Python FastAPI ML inference engine calculating band ratio probabilities.
3. **Phase 3 (3D Subsurface Visualization):**
   - CesiumJS/WebGL subterranean depth grid displaying 3D drillhole trajectories and wireframe vein solids.
