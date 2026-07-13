import sys
import os
import imageio

def webp_to_mp4(input_path, output_path):
    print(f"Converting {input_path} to {output_path}...")
    try:
        reader = imageio.get_reader(input_path)
        fps = reader.get_meta_data().get('fps', 30)
        writer = imageio.get_writer(output_path, fps=fps, codec='libx264', macro_block_size=2)
        for frame in reader:
            writer.append_data(frame)
        writer.close()
        print("Conversion to MP4 successful!")
    except Exception as e:
        print(f"Failed to convert to MP4: {e}")

def webp_to_png(input_path, output_path):
    print(f"Converting {input_path} to {output_path}...")
    try:
        from PIL import Image
        im = Image.open(input_path)
        im.save(output_path, "PNG")
        print("Conversion to PNG successful!")
    except Exception as e:
        print(f"Failed to convert to PNG: {e}")

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python convert_media.py [mp4|png] input.webp output.ext")
        sys.exit(1)
        
    mode = sys.argv[1]
    input_file = sys.argv[2]
    output_file = sys.argv[3]
    
    if mode == 'mp4':
        webp_to_mp4(input_file, output_file)
    elif mode == 'png':
        webp_to_png(input_file, output_file)
    else:
        print("Unknown mode. Use mp4 or png.")
