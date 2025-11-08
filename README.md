# Academica Backend

[Design Document](CompleteDesignDoc.md)\
[Reflection](reflection.md)\
[Screen Recording of User Journey](https://youtu.be/VehjqYeD4gg)
[Trace](Trace.md)


### Starting the Server
```powershell
deno run --allow-net --allow-read --allow-write --allow-env --allow-sys src/concept_server.ts --port 8001
```

### Killing the Server
```powershell
# Kill all Deno processes (recommended)
Get-Process | Where-Object {$_.ProcessName -eq "deno"} | Stop-Process -Force

# Alternative: Kill by specific port
netstat -ano | findstr :8001
taskkill /PID XXXX /F  # Replace XXXX with the actual PID
```

### Context:

In `design/brainstorming/questioning.md`, complete the `# prompt: Why ... ?` with your burning question for the universe. Then, from the root of the repository, run this command in the terminal (if you're using Obsidian, you should be able to copy the command by clicking on `Shell` in the top right):

```shell
./ctx prompt design/brainstorming/questioning.md
```

