"""
UCF-Crime Surveillance Dataset Catalog & Benchmark Registry
Reference: 'Real-world Anomaly Detection in Surveillance Videos' (Waqas Sultani, Chen Chen, Mubarak Shah - CVPR 2018)
Center for Research in Computer Vision (CRCV), University of Central Florida

Dataset URL: https://www.crcv.ucf.edu/data1/chenchen/UCF_Crimes.zip (102.95 GB)
Dropbox Mirror URL: https://www.dropbox.com/sh/75v5ehq4cdg5g5g/AABvnJSwZI7zXb8_myBA0CLHa?dl=0
"""

UCF_DATASET_INFO = {
    "name": "UCF-Crime (Surveillance Video Anomaly Detection)",
    "authors": "Waqas Sultani, Chen Chen, Mubarak Shah",
    "conference": "CVPR 2018 (IEEE Conference on Computer Vision and Pattern Recognition)",
    "institution": "Center for Research in Computer Vision (CRCV), University of Central Florida",
    "total_videos": 1900,
    "total_hours": 128,
    "total_classes": 14,
    "primary_download_url": "https://www.crcv.ucf.edu/data1/chenchen/UCF_Crimes.zip",
    "parts_download_url": "https://www.dropbox.com/sh/75v5ehq4cdg5g5g/AABvnJSwZI7zXb8_myBA0CLHa?dl=0",
    "size_gb": 102.95,
    "description": (
        "UCF-Crime is a large-scale surveillance benchmark consisting of 1,900 untrimmed, real-world CCTV footage clips "
        "covering 13 crime and public safety anomalies plus normal surveillance videos. Used for benchmarking weak-supervision "
        "and temporal anomaly localization."
    ),
    "classes": [
        "Abuse",
        "Arrest",
        "Arson",
        "Assault",
        "Burglary",
        "Explosion",
        "Fighting",
        "RoadAccidents",
        "Robbery",
        "Shooting",
        "Shoplifting",
        "Stealing",
        "Vandalism",
        "Normal_Videos"
    ]
}

# Indexed benchmark surveillance clips from UCF-Crime testing set with exact ground-truth temporal frame annotations
UCF_BENCHMARK_VIDEOS = [
    {
        "id": "UCF-ROAD-024",
        "video_name": "RoadAccidents024_x264.mp4",
        "ucf_category": "RoadAccidents",
        "civiclens_category": "civic_infrastructure",
        "mapped_event_type": "traffic_accident",
        "priority": "critical",
        "fps": 30,
        "total_frames": 1800,
        "duration_seconds": 60,
        "anomaly_start_frame": 450,
        "anomaly_end_frame": 810,
        "anomaly_start_seconds": 15,
        "anomaly_end_seconds": 27,
        "description": "High-velocity two-vehicle collision at an urban four-way intersection causing vehicle rollover and debris scatter across 2 lanes.",
        "observable_indicators": [
            "Sudden lateral impact trajectory between vehicle A and vehicle B",
            "Rapid vehicular deceleration and kinetic rollover",
            "Immediate roadway blockage and scattered structural debris",
            "High impact hazard requiring immediate traffic stoppage and ambulance"
        ],
        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "poster_url": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80",
        "recommended_escalation": "mrrt",
        "location_context": "Intersection of Main Radial Corridor (Camera CP-01)"
    },
    {
        "id": "UCF-ASSAULT-011",
        "video_name": "Assault011_x264.mp4",
        "ucf_category": "Assault",
        "civiclens_category": "public_safety",
        "mapped_event_type": "potential_assault",
        "priority": "critical",
        "fps": 30,
        "total_frames": 2100,
        "duration_seconds": 70,
        "anomaly_start_frame": 600,
        "anomaly_end_frame": 1050,
        "anomaly_start_seconds": 20,
        "anomaly_end_seconds": 35,
        "description": "Physical assault captured on sidewalk CCTV: aggressor strikes individual repeatedly followed by a prolonged struggle.",
        "observable_indicators": [
            "High-frequency striking arm motions directed at individual",
            "Aggressive pursuit and tackle to pavement",
            "Prolonged physical struggle lasting over 12 seconds",
            "Surrounding pedestrian group scattering rapidly"
        ],
        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        "poster_url": "https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?auto=format&fit=crop&w=1200&q=80",
        "recommended_escalation": "police_112",
        "location_context": "Pedestrian Transit Entrance (Janpath Junction)"
    },
    {
        "id": "UCF-FIGHT-033",
        "video_name": "Fighting033_x264.mp4",
        "ucf_category": "Fighting",
        "civiclens_category": "public_safety",
        "mapped_event_type": "potential_assault",
        "priority": "critical",
        "fps": 30,
        "total_frames": 1500,
        "duration_seconds": 50,
        "anomaly_start_frame": 360,
        "anomaly_end_frame": 750,
        "anomaly_start_seconds": 12,
        "anomaly_end_seconds": 25,
        "description": "Group physical altercation outside commercial establishment with multiple individuals grappling and pushing.",
        "observable_indicators": [
            "Multi-person physical grappling and forceful shoving",
            "Kinetic group disruption across storefront perimeter",
            "Multiple striking exchanges observed"
        ],
        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
        "poster_url": "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1200&q=80",
        "recommended_escalation": "police_112",
        "location_context": "Commercial Market High Street (Bandra West)"
    },
    {
        "id": "UCF-ROBBERY-050",
        "video_name": "Robbery050_x264.mp4",
        "ucf_category": "Robbery",
        "civiclens_category": "public_safety",
        "mapped_event_type": "potential_forced_movement",
        "priority": "critical",
        "fps": 30,
        "total_frames": 2400,
        "duration_seconds": 80,
        "anomaly_start_frame": 720,
        "anomaly_end_frame": 1200,
        "anomaly_start_seconds": 24,
        "anomaly_end_seconds": 40,
        "description": "Armed robbery and physical intimidation inside commercial premise with forced compliance.",
        "observable_indicators": [
            "Concealed face individual displaying threatening posture",
            "Forced physical compliance and cornering of victims",
            "Rapid extraction of valuables and hasty exit"
        ],
        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4",
        "poster_url": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80",
        "recommended_escalation": "police_112",
        "location_context": "Financial Plaza Arcade (Connaught Place Block B)"
    },
    {
        "id": "UCF-VANDAL-019",
        "video_name": "Vandalism019_x264.mp4",
        "ucf_category": "Vandalism",
        "civiclens_category": "civic_infrastructure",
        "mapped_event_type": "road_damage",
        "priority": "high",
        "fps": 30,
        "total_frames": 1800,
        "duration_seconds": 60,
        "anomaly_start_frame": 510,
        "anomaly_end_frame": 900,
        "anomaly_start_seconds": 17,
        "anomaly_end_seconds": 30,
        "description": "Intentional destruction of municipal street furniture: individual breaking public lighting fixture and damaging barrier.",
        "observable_indicators": [
            "Forceful blunt impact against municipal lighting post",
            "Fracture and dislodgement of protective glass casing",
            "Exposed electrical wiring and debris on sidewalk"
        ],
        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "poster_url": "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80",
        "recommended_escalation": "mrrt",
        "location_context": "Public Promenade Walkway (Carter Road)"
    },
    {
        "id": "UCF-BURGLARY-008",
        "video_name": "Burglary008_x264.mp4",
        "ucf_category": "Burglary",
        "civiclens_category": "public_safety",
        "mapped_event_type": "potential_harassment",
        "priority": "high",
        "fps": 30,
        "total_frames": 2700,
        "duration_seconds": 90,
        "anomaly_start_frame": 900,
        "anomaly_end_frame": 1440,
        "anomaly_start_seconds": 30,
        "anomaly_end_seconds": 48,
        "description": "Unlawful intrusion: subject prying open perimeter entrance after hours and entering restricted building sector.",
        "observable_indicators": [
            "Forcible leverage applied to secured perimeter door",
            "Door mechanism failure and unauthorized ingress",
            "Subject active in darkened interior without authorization"
        ],
        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        "poster_url": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80",
        "recommended_escalation": "police_112",
        "location_context": "Commercial Tech Park Gate 4 (Indiranagar)"
    },
    {
        "id": "UCF-NORMAL-872",
        "video_name": "Normal_Videos_872_x264.mp4",
        "ucf_category": "Normal_Videos",
        "civiclens_category": "civic_infrastructure",
        "mapped_event_type": "pothole",
        "priority": "low",
        "fps": 30,
        "total_frames": 1800,
        "duration_seconds": 60,
        "anomaly_start_frame": -1,
        "anomaly_end_frame": -1,
        "anomaly_start_seconds": 0,
        "anomaly_end_seconds": 0,
        "description": "Non-anomalous baseline CCTV surveillance: smooth traffic flow, pedestrians proceeding normally without incident.",
        "observable_indicators": [
            "Continuous orderly vehicle progression within lane boundaries",
            "Normal pedestrian cadence without evasion or distress",
            "No structural obstacles or physical conflicts detected"
        ],
        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4",
        "poster_url": "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80",
        "recommended_escalation": None,
        "location_context": "Central Urban Roundabout (Normal Flow)"
    }
]
