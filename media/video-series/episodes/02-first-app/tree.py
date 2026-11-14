"""What generation wrote (real/files.txt), grouped the way a person reads a project: each group with
its real file count. Every file is counted once, in the first group that claims it."""
import sys
files = [l.strip()[2:] for l in open(sys.argv[1]) if l.strip().startswith('./')]
GROUPS = [
    ("catalog/  domain: the aggregate and its values", lambda f: f.startswith('library/catalog/') and '/main/' in f and '/domain/' in f),
    ("catalog/  application: use cases and queries", lambda f: f.startswith('library/catalog/') and '/main/' in f and '/application/' in f),
    ("catalog/  infrastructure: persistence and screens", lambda f: f.startswith('library/catalog/') and '/main/' in f and '/infra/' in f),
    ("catalog/  tests: unit, BDD and end to end", lambda f: f.startswith('library/catalog/') and ('/test/' in f or '/features/' in f)),
    ("library-app/  migrations, H2 and PostgreSQL", lambda f: '/db/migration' in f),
    ("library-app/  the Spring Boot app and its config", lambda f: f.startswith('library/library-app/')),
    ("library-custom/  your code: the custom zone", lambda f: f.startswith('library/library-custom/')),
    ("Dockerfile, docker-compose, up.sh / down.sh", lambda f: f.split('/')[-1] in ('Dockerfile', 'docker-compose.yml', 'up.sh', 'down.sh') or f.startswith('postgres-init/') or f.startswith('deploy/')),
    ("Kubernetes manifests", lambda f: '/k8s/' in f or f.startswith('k8s/')),
    ("Terraform skeleton", lambda f: f.startswith('terraform/')),
    ("CI workflow (GitHub Actions)", lambda f: f.startswith('.github/')),
    ("e2e suite (Playwright)", lambda f: f.startswith('e2e/')),
    ("Maven build: poms", lambda f: f.endswith('pom.xml')),
    ("README", lambda f: f.endswith('README.md')),
]
counts = [0] * len(GROUPS); rest = []
for f in files:
    for i, (_, rule) in enumerate(GROUPS):
        if rule(f): counts[i] += 1; break
    else: rest.append(f)
for (label, _), n in zip(GROUPS, counts):
    if n: print(f"{label:<52} {n:>3} file{'s' if n != 1 else ''}")
if rest: print(f"{'other':<52} {len(rest):>3} files   # " + ' '.join(rest[:4]), file=sys.stderr)
