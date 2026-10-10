import numpy as np
from PIL import Image
import io

def extract_image_features(image_input) -> np.ndarray:
    """
    Extracts 30 deep visual and spatial features from an image:
    0-8: Color channel statistics (mean, std, median for R, G, B)
    9-10: Grayscale luminance mean and std
    11-12: Sobel Edge energy and gradient variance
    13: Center vs perimeter depression contrast (pothole cavity depth)
    14: Specular reflection highlights (puddle / water glare)
    15: Blue-to-red ratio (clean water / sky vs asphalt)
    16: Local patch entropy (chaotic garbage clutter)
    17: Low ambient darkness ratio (nighttime streetlight detection)
    18: Point light cluster (lamp glow in darkness)
    19: Directional fissure orientation (linear road crack vs pothole)
    20: Periodic line/grating energy (drainage storm grate)
    21: Sky & Cloud Presence Ratio (Daytime overhead streetlight detection)
    22: Ground Asphalt Pavement Ratio (Potholes, Road damage, Drains)
    23: Linear Pole & Arm Structure Energy (Hough-like diagonal/vertical bar)
    24: Suspended Foreground Object Ratio (Lamp fixture dangling against sky)
    25: Puddle Boundary Gradient (Water meeting dry asphalt)
    26: Multi-Color Diversity Entropy (Trash wrapper cluster count)
    27: Concentric Rim Circularity (Round pothole crater)
    28: Vertical Pole Line Energy (Streetlight pole)
    29: Surface Roughness Variance (Gravel vs smooth liquid)
    """
    if isinstance(image_input, (bytes, bytearray)):
        img = Image.open(io.BytesIO(image_input))
    elif isinstance(image_input, str):
        img = Image.open(image_input)
    elif isinstance(image_input, Image.Image):
        img = image_input
    else:
        raise ValueError("Unsupported image input type")

    img = img.convert("RGB")
    # Resize to standard analysis size (128x128)
    img_resized = img.resize((128, 128))
    arr = np.array(img_resized, dtype=np.float32) / 255.0

    features = []

    # 0-8: RGB Color channel statistics (mean, std, median)
    for c in range(3):
        channel = arr[:, :, c]
        features.append(float(np.mean(channel)))
        features.append(float(np.std(channel)))
        features.append(float(np.median(channel)))

    # 9-10: Grayscale luminance
    gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    features.append(float(np.mean(gray)))
    features.append(float(np.std(gray)))

    # 11-12: Spatial Gradients (Sobel-like edge energy)
    dx = np.diff(gray, axis=1)
    dy = np.diff(gray, axis=0)
    edge_energy = float(np.mean(np.abs(dx)) + np.mean(np.abs(dy)))
    edge_std = float(np.std(dx) + np.std(dy))
    features.append(edge_energy)
    features.append(edge_std)

    # 13: Center vs perimeter cavity contrast (Pothole marker: dark center surrounded by lighter pavement)
    center_patch = gray[32:96, 32:96]
    perimeter_mean = float((np.sum(gray) - np.sum(center_patch)) / (128*128 - 64*64))
    center_mean = float(np.mean(center_patch))
    center_contrast = center_mean - perimeter_mean
    features.append(center_contrast)

    # 14: Specular reflection highlights (Water sheen)
    specular_pixels = float(np.sum(gray > 0.88) / (128 * 128))
    features.append(specular_pixels)

    # 15: Blue ratio
    blue_ratio = float(np.mean(arr[:, :, 2]) / (np.mean(arr[:, :, 0]) + 1e-5))
    features.append(blue_ratio)

    # 16: Local patch entropy (Garbage clutter)
    patch_means = []
    for i in range(4):
        for j in range(4):
            patch = arr[i*32:(i+1)*32, j*32:(j+1)*32]
            patch_means.append(float(np.mean(patch)))
    entropy_estimate = float(np.std(patch_means))
    features.append(entropy_estimate)

    # 17: Low ambient darkness ratio (Night streetlight)
    low_ambient_darkness = float(np.sum(gray < 0.25) / (128 * 128))
    features.append(low_ambient_darkness)

    # 18: Point light cluster (Lamp beam in darkness)
    point_light_cluster = float(np.sum((gray > 0.90) & (arr[:, :, 0] > 0.8) & (arr[:, :, 1] > 0.8)) / (128 * 128))
    features.append(point_light_cluster)

    # 19: Directional fissure orientation (Road cracks)
    horizontal_edges = float(np.mean(np.abs(dy)))
    vertical_edges = float(np.mean(np.abs(dx)))
    fissure_ratio = horizontal_edges / (vertical_edges + 1e-5)
    features.append(fissure_ratio)

    # 20: Periodic line/grating energy (Drainage slotted grates)
    col_sums = np.sum(gray, axis=0)
    col_diffs = float(np.std(np.diff(col_sums)))
    features.append(col_diffs)

    # 21: Sky & Cloud Presence Ratio (Daytime overhead streetlight detection)
    is_sky_blue = (arr[:, :, 2] > arr[:, :, 0] + 0.08) & (arr[:, :, 2] > 0.35)
    is_cloud_white = (arr[:, :, 0] > 0.65) & (arr[:, :, 1] > 0.65) & (arr[:, :, 2] > 0.65)
    is_sky_or_cloud = is_sky_blue | is_cloud_white
    sky_ratio = float(np.mean(is_sky_or_cloud))
    features.append(sky_ratio)

    # 22: Ground Asphalt Pavement Ratio (Grey/brown low-saturation road tones)
    color_diff = np.maximum(
        np.abs(arr[:, :, 0] - arr[:, :, 1]),
        np.maximum(np.abs(arr[:, :, 1] - arr[:, :, 2]), np.abs(arr[:, :, 0] - arr[:, :, 2]))
    )
    is_ground_asphalt = (color_diff < 0.12) & (gray > 0.15) & (gray < 0.70)
    ground_ratio = float(np.mean(is_ground_asphalt))
    features.append(ground_ratio)

    # 23: Linear Pole & Arm Structure Energy (Elongated diagonal / straight line of light pole)
    diagonal_energy = float(np.mean(np.abs(np.diagonal(gray))))
    features.append(diagonal_energy)

    # 24: Suspended Foreground Object Ratio (Non-sky object hanging in upper/center frame)
    if sky_ratio > 0.30:
        non_sky_foreground = float(np.mean((~is_sky_or_cloud) & (gray < 0.65)))
    else:
        non_sky_foreground = 0.0
    features.append(non_sky_foreground)

    # 25: Puddle Boundary Gradient (Water sheen meeting pavement)
    puddle_boundary = float(np.std(arr[:, :, 2] - gray))
    features.append(puddle_boundary)

    # 26: Multi-Color Diversity Entropy (Number of distinct color clusters for garbage)
    r_bins = (arr[:, :, 0] * 3).astype(int)
    g_bins = (arr[:, :, 1] * 3).astype(int)
    b_bins = (arr[:, :, 2] * 3).astype(int)
    color_codes = r_bins * 9 + g_bins * 3 + b_bins
    unique_colors = float(len(np.unique(color_codes)) / 27.0)
    features.append(unique_colors)

    # 27: Concentric Rim Circularity (Pothole rim circular energy)
    radial_diff = float(np.abs(np.mean(center_patch) - np.mean(gray[16:112, 16:112])))
    features.append(radial_diff)

    # 28: Vertical Pole Line Energy (Vertical line consistency in upper half)
    upper_cols = np.mean(gray[0:64, :], axis=0)
    vert_pole_peak = float(np.max(upper_cols) - np.min(upper_cols))
    features.append(vert_pole_peak)

    # 29: Surface Roughness Variance
    surface_roughness = float(np.std(gray - np.mean(gray)))
    features.append(surface_roughness)

    return np.array(features, dtype=np.float32)
