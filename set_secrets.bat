@echo off
set GH_TOKEN=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
type %USERPROFILE%\.ssh\andika_rsa | .\gh_cli\bin\gh.exe secret set SSH_PRIVATE_KEY --repo masdikaaa/masdika.id
.\gh_cli\bin\gh.exe secret set SERVER_IP -b"45.198.149.134" --repo masdikaaa/masdika.id
.\gh_cli\bin\gh.exe secret set SSH_PORT -b"34789" --repo masdikaaa/masdika.id
.\gh_cli\bin\gh.exe secret set SERVER_USER -b"andika" --repo masdikaaa/masdika.id
