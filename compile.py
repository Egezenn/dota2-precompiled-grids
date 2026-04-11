import os
import json
import sys
import subprocess
import shutil
import urllib.request
from dotenv import load_dotenv


def get_all_hero_ids():
    """Fetch all hero IDs from the constants CSV."""
    try:
        url = "https://raw.githubusercontent.com/Egezenn/OpenDotaGuides/refs/heads/main/constants/heroes.csv"
        with urllib.request.urlopen(url) as response:
            content = response.read().decode("utf-8")
        lines = content.strip().split("\n")
        return sorted(int(l.split(",")[0]) for l in lines[1:])
    except Exception as e:
        print(f"Warning: Failed to fetch latest hero list: {e}")
        return []


def fetch_spectral_data():
    """Fetch positional data from spectral.gg with a browser User-Agent."""
    url = "https://stats.spectral.gg/lrg2/api/?mod=heroes-positions&cat=ranked_patches&latest="
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode("utf-8"))
            result = data.get("result", {})
            # Map P1..P5 to their internal IDs
            mapping = {
                "P1": "1.1",
                "P2": "1.2",
                "P3": "1.3",
                "P4": "0.1",
                "P5": "0.3"
            }
            processed = {}
            for pos, key in mapping.items():
                pos_data = result.get(key, {})
                # Heroes are already sorted by rank in the dict keys
                processed[pos] = [int(h_id) for h_id in pos_data.keys()]
            return processed
    except Exception as e:
        print(f"Warning: Failed to fetch spectral data: {e}")
        return {}


def compile():
    load_dotenv()

    stratz_key = os.getenv("STRATZ_API_KEY")
    if not stratz_key or stratz_key == "your_stratz_token_here":
        print("Warning: STRATZ_API_KEY is not set in .env")
        stratz_key = ""

    with open("settings.json", "r") as f:
        settings = json.load(f)

    settings["globals"]["stratz_api_key"] = stratz_key

    # Dynamically inject "All Heroes" list
    all_heroes = get_all_hero_ids()
    if all_heroes:
        for config in settings["configs"]:
            for cat in config["categories"]:
                if cat["name"] == "All Heroes":
                    cat["source"] = "inline"
                    cat["param"] = all_heroes

    # Dynamically inject Spectral data
    spectral_data = fetch_spectral_data()
    if spectral_data:
        for config in settings["configs"]:
            for cat in config["categories"]:
                if cat.get("source") == "spectral":
                    pos = cat["param"].get("position")
                    top = cat["param"].get("top", 12)
                    if pos in spectral_data:
                        cat["source"] = "inline"
                        cat["param"] = spectral_data[pos][:top]
                        print(f"Injected Spectral {pos} (top {top}) as inline source.")

    # Save to a temporary file
    temp_settings = "settings_generated.json"
    with open(temp_settings, "w") as f:
        json.dump(settings, f, indent=4)

    print(f"Generated {temp_settings} with API key.")

    # Run d2grid
    print(f"Running generator for {temp_settings}...")
    result = subprocess.run(["uvx", "d2grid", temp_settings], capture_output=True, text=True)

    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)

    # Sync to docs if successful
    if result.returncode == 0:
        # Check if the output file exists before copying
        output_file = "hero_grid_config.json"
        if os.path.exists(output_file):
            shutil.copy2(output_file, os.path.join("docs", output_file))
            print(f"Successfully updated docs/{output_file}")
        else:
            print(f"Error: {output_file} not found after generation", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"Error: d2grid failed with return code {result.returncode}", file=sys.stderr)
        sys.exit(result.returncode)

    os.remove(temp_settings)


if __name__ == "__main__":
    compile()
