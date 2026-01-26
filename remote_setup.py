import paramiko
import re
import time
import sys

hostname = '145.223.31.180'
username = 'root'
password = '238554A@a238554A@a'
project_dir = '/root/moveis-pro'

def run_cmd(ssh, cmd, stream_output=True):
    print(f"CMD: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    full_out = ""
    # Stream output explicitly 
    if stream_output:
        while True:
            line = stdout.readline()
            if not line:
                break
            try:
                print(line.strip())
            except UnicodeEncodeError:
                # Fallback for windows console
                print(line.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding).strip())
            full_out += line
    else:
        full_out = stdout.read().decode('utf-8', errors='replace')
        try:
             print(full_out)
        except UnicodeEncodeError:
             print(full_out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding))

        
    err = stderr.read().decode()
    if err:
        print(f"STDERR: {err}")
    
    return full_out

def main():
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(hostname, username=username, password=password)
        print("Connected.")

        # 1. Check/Install Supabase
        print("\n--- Checking Supabase CLI ---")
        check_sb = run_cmd(client, "supabase --version", stream_output=False)
        if "command not found" in check_sb or not check_sb:
             print("Supabase CLI not found. Running vps_setup.sh...")
             # Run the setup script
             run_cmd(client, f"chmod +x {project_dir}/vps_setup.sh", stream_output=False)
             run_cmd(client, f"bash {project_dir}/vps_setup.sh", stream_output=True)
             
             # Attempt to add brew to path for this session so we can use it immediately
             # (vps_setup.sh adds it to .bashrc but that doesn't affect current non-interactive shell usually)
             brew_cmd = 'test -d /home/linuxbrew/.linuxbrew && eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)" && which supabase'
             brew_check = run_cmd(client, brew_cmd, stream_output=False)
             if brew_check:
                 print(f"Brew found supabase at: {brew_check}")
             else:
                 print("Warning: Could not enable brew in current session. 'supabase' command might still fail.")

        # 2. Start Supabase
        print("\n--- Starting Supabase (this may take time) ---")
        # -d for valid daemon mode, but we need output for keys.
        # usually 'supabase start' outputs keys then stays running? No, 'supabase start' starts docker containers and exits.
        # It outputs keys at the end.
        sb_out = run_cmd(client, f"cd {project_dir} && supabase stop && supabase start", stream_output=True)
        
        # 3. Parse Keys
        print("\n--- Parsing Credentials ---")
        anon_key = re.search(r'anon key: (.*)', sb_out)
        service_key = re.search(r'service_role key: (.*)', sb_out)
        api_url = re.search(r'API URL: (.*)', sb_out)
        
        if not anon_key or not service_key or not api_url:
            print("Could not find keys in output. Trying 'supabase status'...")
            status_out = run_cmd(client, f"cd {project_dir} && supabase status", stream_output=True)
            anon_key = re.search(r'anon key: (.*)', status_out)
            service_key = re.search(r'service_role key: (.*)', status_out)
            api_url = re.search(r'API URL: (.*)', status_out)

        if not anon_key:
            print("FAILED TO GET KEYS. Aborting.")
            return

        anon_key = anon_key.group(1).strip()
        service_key = service_key.group(1).strip()
        api_url_val = api_url.group(1).strip() # usually http://localhost:54321
        
        # Fix API URL to use public IP instead of localhost
        public_api_url = api_url_val.replace("localhost", hostname).replace("127.0.0.1", hostname)
        
        print(f"GOT KEYS:\nANON: {anon_key[:20]}...\nURL: {public_api_url}")

        # 4. Generate .env
        print("\n--- Updating .env ---")
        env_content = f"""
# PROD ENV
SUPABASE_URL={public_api_url}
SUPABASE_ANON_KEY={anon_key}
SUPABASE_SERVICE_ROLE_KEY={service_key}

# Evolution API
EVOLUTION_API_URL=http://{hostname}:8085
EVOLUTION_API_KEY=moveispro_prod_key_2026
# Instance name
EVOLUTION_INSTANCE_NAME=moveis-pro

# Internal Docker Networking
# Note: Docker containers usually talk to each other via network names, 
# but for simplicity we rely on 'evolution-api' service name in docker-compose.
# The FRONTEND needs to access supabase via PUBLIC URL (browser).
# The FRONTEND needs to access Evolution via PUBLIC URL (browser? no, usually backend, but here likely frontend calls it?)
# If frontend calls evolution, it needs public IP.

POSTGRES_PASSWORD=postgres
GEMINI_API_KEY=AIzaSyAdygxV1LNWAMzUQdbIA-ZUPvdHQLIDycI
"""
        # Escape quotes for echo
        safe_env = env_content.replace('"', '\\"')
        
        # Write .env
        create_env_cmd = f"cat <<EOF > {project_dir}/.env\n{env_content}\nEOF"
        run_cmd(client, create_env_cmd, stream_output=False)
        
        # 5. Start Docker Compose
        print("\n--- Starting Docker Stack ---")
        # Force rebuild to pick up new ENV vars if baked in (vite uses them at build time!)
        run_cmd(client, f"cd {project_dir} && docker compose -f docker-compose.prod.yml up -d --build", stream_output=True)
        
        print("\n--- DONE ---")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    main()
