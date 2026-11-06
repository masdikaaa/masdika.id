"use client";

import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

function AwsOriginalIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 304 182" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation" aria-hidden="true" aria-label="AWS Cloud" {...props}>
      <path
        className="fill-[#252F3E] dark:fill-white"
        d="M86.4 66.4c0 3.7.4 6.7 1.1 8.9.8 2.2 1.8 4.6 3.2 7.2.5.8.7 1.6.7 2.3 0 1-.6 2-1.9 3l-6.3 4.2c-.9.6-1.8.9-2.6.9-1 0-2-.5-3-1.4-1.4-1.5-2.6-3.1-3.6-4.7-1-1.7-2-3.6-3.1-5.9-7.8 9.2-17.6 13.8-29.4 13.8-8.4 0-15.1-2.4-20-7.2-4.9-4.8-7.4-11.2-7.4-19.2 0-8.5 3-15.4 9.1-20.6 6.1-5.2 14.2-7.8 24.5-7.8 3.4 0 6.9.3 10.6.8 3.7.5 7.5 1.3 11.5 2.2v-7.3c0-7.6-1.6-12.9-4.7-16-3.2-3.1-8.6-4.6-16.3-4.6-3.5 0-7.1.4-10.8 1.3-3.7.9-7.3 2-10.8 3.4-1.6.7-2.8 1.1-3.5 1.3-.7.2-1.2.3-1.6.3-1.4 0-2.1-1-2.1-3.1v-4.9c0-1.6.2-2.8.7-3.5.5-.7 1.4-1.4 2.8-2.1 3.5-1.8 7.7-3.3 12.6-4.5 4.9-1.3 10.1-1.9 15.6-1.9 11.9 0 20.6 2.7 26.2 8.1 5.5 5.4 8.3 13.6 8.3 24.6v32.4zM45.8 81.6c3.3 0 6.7-.6 10.3-1.8 3.6-1.2 6.8-3.4 9.5-6.4 1.6-1.9 2.8-4 3.4-6.4.6-2.4 1-5.3 1-8.7v-4.2c-2.9-.7-6-1.3-9.2-1.7-3.2-.4-6.3-.6-9.4-.6-6.7 0-11.6 1.3-14.9 4-3.3 2.7-4.9 6.5-4.9 11.5 0 4.7 1.2 8.2 3.7 10.6 2.4 2.5 5.9 3.7 10.5 3.7zm80.3 10.8c-1.8 0-3-.3-3.8-1-.8-.6-1.5-2-2.1-3.9L96.7 10.2c-.6-2-.9-3.3-.9-4 0-1.6.8-2.5 2.4-2.5h9.8c1.9 0 3.2.3 3.9 1 .8.6 1.4 2 2 3.9l16.8 66.2 15.6-66.2c.5-2 1.1-3.3 1.9-3.9.8-.6 2.2-1 4-1h8c1.9 0 3.2.3 4 1 .8.6 1.5 2 1.9 3.9l15.8 67 17.3-67c.6-2 1.3-3.3 2-3.9.8-.6 2.1-1 3.9-1h9.3c1.6 0 2.5.8 2.5 2.5 0 .5-.1 1-.2 1.6-.1.6-.3 1.4-.7 2.5l-24.1 77.3c-.6 2-1.3 3.3-2.1 3.9-.8.6-2.1 1-3.8 1h-8.6c-1.9 0-3.2-.3-4-1-.8-.7-1.5-2-1.9-4L156 23l-15.4 64.4c-.5 2-1.1 3.3-1.9 4-.8.7-2.2 1-4 1h-8.6zm128.5 2.7c-5.2 0-10.4-.6-15.4-1.8-5-1.2-8.9-2.5-11.5-4-1.6-.9-2.7-1.9-3.1-2.8-.4-.9-.6-1.9-.6-2.8v-5.1c0-2.1.8-3.1 2.3-3.1.6 0 1.2.1 1.8.3.6.2 1.5.6 2.5 1 3.4 1.5 7.1 2.7 11 3.5 4 .8 7.9 1.2 11.9 1.2 6.3 0 11.2-1.1 14.6-3.3 3.4-2.2 5.2-5.4 5.2-9.5 0-2.8-.9-5.1-2.7-7-1.8-1.9-5.2-3.6-10.1-5.2L246 52c-7.3-2.3-12.7-5.7-16-10.2-3.3-4.4-5-9.3-5-14.5 0-4.2.9-7.9 2.7-11.1 1.8-3.2 4.2-6 7.2-8.2 3-2.3 6.4-4 10.4-5.2 4-1.2 8.2-1.7 12.6-1.7 2.2 0 4.5.1 6.7.4 2.3.3 4.4.7 6.5 1.1 2 .5 3.9 1 5.7 1.6 1.8.6 3.2 1.2 4.2 1.8 1.4.8 2.4 1.6 3 2.5.6.8.9 1.9.9 3.3v4.7c0 2.1-.8 3.2-2.3 3.2-.8 0-2.1-.4-3.8-1.2-5.7-2.6-12.1-3.9-19.2-3.9-5.7 0-10.2.9-13.3 2.8-3.1 1.9-4.7 4.8-4.7 8.9 0 2.8 1 5.2 3 7.1 2 1.9 5.7 3.8 11 5.5l14.2 4.5c7.2 2.3 12.4 5.5 15.5 9.6 3.1 4.1 4.6 8.8 4.6 14 0 4.3-.9 8.2-2.6 11.6-1.8 3.4-4.2 6.4-7.3 8.8-3.1 2.5-6.8 4.3-11.1 5.6-4.5 1.4-9.2 2.1-14.3 2.1z"
      />
      <path
        fill="#FF9900"
        d="M273.5 143.7c-32.9 24.3-80.7 37.2-121.8 37.2-57.6 0-109.5-21.3-148.7-56.7-3.1-2.8-.3-6.6 3.4-4.4 42.4 24.6 94.7 39.5 148.8 39.5 36.5 0 76.6-7.6 113.5-23.2 5.5-2.5 10.2 3.6 4.8 7.6z"
      />
      <path
        fill="#FF9900"
        d="M287.2 128.1c-4.2-5.4-27.8-2.6-38.5-1.3-3.2.4-3.7-2.4-.8-4.5 18.8-13.2 49.7-9.4 53.3-5 3.6 4.5-1 35.4-18.6 50.2-2.7 2.3-5.3 1.1-4.1-1.9 4-9.9 12.9-32.2 8.7-37.5z"
      />
    </svg>
  );
}

interface TechItem {
  name: string;
  category: string;
  img: string;
  IconComponent?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconColor?: string;
}

const ROW_1: TechItem[] = [
  { name: "AWS Cloud", category: "Cloud Platform", img: "", IconComponent: AwsOriginalIcon },
  { name: "Google Cloud", category: "Cloud Platform", img: "googlecloud/googlecloud-original.svg" },
  { name: "Azure", category: "Enterprise Cloud", img: "azure/azure-original.svg" },
  { name: "DigitalOcean", category: "Cloud Compute", img: "digitalocean/digitalocean-original.svg" },
  { name: "Cloudflare", category: "Edge & Security", img: "cloudflare/cloudflare-original.svg" },
  { name: "Heroku", category: "PaaS Runtime", img: "heroku/heroku-original.svg" },
  { name: "Vercel", category: "Edge Network", img: "vercel/vercel-original.svg" },
  { name: "Netlify", category: "Web Deployment", img: "netlify/netlify-original.svg" },
  { name: "Docker", category: "Containerization", img: "docker/docker-original.svg" },
  { name: "Podman", category: "Rootless Containers", img: "podman/podman-original.svg" },
  { name: "Kubernetes", category: "Orchestration", img: "kubernetes/kubernetes-plain.svg" },
  { name: "Helm", category: "K8s Package Mgr", img: "helm/helm-original.svg" },
  { name: "Terraform", category: "Infra as Code", img: "terraform/terraform-original.svg" },
  { name: "Pulumi", category: "Modern IaC", img: "pulumi/pulumi-original.svg" },
  { name: "Ansible", category: "Config Automation", img: "ansible/ansible-original.svg" },
  { name: "Puppet", category: "State Management", img: "https://cdn.simpleicons.org/puppet" },
  { name: "Chef", category: "Infra Automation", img: "https://cdn.simpleicons.org/chef" },
  { name: "Packer", category: "Image Builder", img: "packer/packer-original.svg" },
  { name: "Vagrant", category: "Dev Environments", img: "vagrant/vagrant-original.svg" },
  { name: "GitHub Actions", category: "CI/CD Workflows", img: "github/github-original.svg" },
  { name: "GitLab CI", category: "DevSecOps CI/CD", img: "gitlab/gitlab-original.svg" },
  { name: "Jenkins", category: "Build Automation", img: "jenkins/jenkins-original.svg" },
  { name: "CircleCI", category: "Continuous Delivery", img: "circleci/circleci-plain.svg" },
  { name: "Travis CI", category: "Automated Testing", img: "travis/travis-plain.svg" },
  { name: "Bitbucket", category: "Source Control", img: "bitbucket/bitbucket-original.svg" },
  { name: "ArgoCD", category: "GitOps Delivery", img: "argocd/argocd-original.svg" },
  { name: "Istio", category: "Service Mesh", img: "https://cdn.simpleicons.org/istio" },
  { name: "Consul", category: "Service Discovery", img: "consul/consul-original.svg" },
  { name: "Vault", category: "Secrets Engine", img: "vault/vault-original.svg" },
  { name: "SonarQube", category: "Code Quality", img: "sonarqube/sonarqube-original.svg" },
];

const ROW_2: TechItem[] = [
  { name: "Linux", category: "Kernel & OS", img: "linux/linux-original.svg" },
  { name: "Ubuntu", category: "Server OS", img: "ubuntu/ubuntu-original.svg" },
  { name: "Debian", category: "Stable Linux OS", img: "debian/debian-original.svg" },
  { name: "AlmaLinux", category: "Enterprise RHEL", img: "almalinux/almalinux-original.svg" },
  { name: "Red Hat", category: "Enterprise Linux", img: "redhat/redhat-original.svg" },
  { name: "Fedora", category: "Upstream Linux", img: "fedora/fedora-original.svg" },
  { name: "Bash", category: "Shell Scripting", img: "bash/bash-original.svg" },
  { name: "Nginx", category: "Reverse Proxy", img: "nginx/nginx-original.svg" },
  { name: "Apache", category: "HTTP Server", img: "apache/apache-original.svg" },
  { name: "Traefik", category: "Cloud Ingress", img: "https://doc.traefik.io/traefik/assets/img/traefik.logo.png" },
  { name: "Caddy", category: "Auto-TLS Web Server", img: "https://cdn.simpleicons.org/caddy" },
  { name: "Splunk", category: "SIEM & Analytics", img: "https://cdn.simpleicons.org/splunk" },
  { name: "Prometheus", category: "Metrics & Alerting", img: "prometheus/prometheus-original.svg" },
  { name: "Grafana", category: "Observability UI", img: "grafana/grafana-original.svg" },
  { name: "Elasticsearch", category: "Search & Indexing", img: "elasticsearch/elasticsearch-original.svg" },
  { name: "Logstash", category: "Log Pipeline", img: "logstash/logstash-original.svg" },
  { name: "Kibana", category: "Log Visualization", img: "kibana/kibana-original.svg" },
  { name: "Datadog", category: "Cloud APM", img: "datadog/datadog-original.svg" },
  { name: "SQLite", category: "Embedded SQL", img: "sqlite/sqlite-original.svg" },
  { name: "Sentry", category: "Error Tracking", img: "sentry/sentry-original.svg" },
  { name: "PostgreSQL", category: "Relational DB", img: "postgresql/postgresql-original.svg" },
  { name: "MySQL", category: "Relational DB", img: "mysql/mysql-original.svg" },
  { name: "Redis", category: "In-Memory Cache", img: "redis/redis-plain.svg" },
  { name: "MongoDB", category: "NoSQL Document DB", img: "mongodb/mongodb-original.svg" },
  { name: "RabbitMQ", category: "Message Broker", img: "rabbitmq/rabbitmq-original.svg" },
  { name: "Apache Kafka", category: "Event Streaming", img: "apachekafka/apachekafka-original.svg" },
  { name: "Go", category: "Systems Language", img: "go/go-original.svg" },
  { name: "Python", category: "Automation & AI", img: "python/python-original.svg" },
  { name: "Rust", category: "Memory-Safe Sys", img: "rust/rust-original.svg" },
  { name: "Node.js", category: "Backend Runtime", img: "nodejs/nodejs-original.svg" },
];

// Duplicate items to ensure seamless 50% loop
const MARQUEE_1 = [...ROW_1, ...ROW_1];
const MARQUEE_2 = [...ROW_2, ...ROW_2];

const NEEDS_INVERT = [
  "GitHub Actions",
  "Vercel",
  "Rust",
  "Apache Kafka",
  "Helm",
  "Travis CI",
  "Istio",
  "Splunk",
];

function TechCard({ skill, isDark }: { skill: TechItem; isDark: boolean }) {
  const iconSrc = skill.img.startsWith("http")
    ? skill.img
    : `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${skill.img}`;
  const IconComp = skill.IconComponent;

  return (
    <div className="w-[230px] sm:w-[250px] mx-2.5 shrink-0">
      <div className="group relative rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer h-full flex items-center gap-3.5 border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.08)]">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-[var(--border-primary)] bg-[var(--surface-secondary)] group-hover:border-cyan-500/30 transition-colors">
          {IconComp ? (
            <IconComp
              className={cn(
                "h-6 w-6 transition-transform duration-300 group-hover:scale-110",
                skill.iconColor || "text-[var(--text-primary)]"
              )}
              role="presentation"
              aria-hidden="true"
              aria-label={skill.name}
            />
          ) : (
            <img
              referrerPolicy="no-referrer"
              src={iconSrc}
              width="26"
              height="26"
              className={cn(
                "h-6 w-6 object-contain transition-transform duration-300 group-hover:scale-110",
                NEEDS_INVERT.includes(skill.name) && isDark && "invert opacity-85"
              )}
              alt={skill.name}
              loading="lazy"
              decoding="async"
            />
          )}
        </div>

        <div className="min-w-0 flex-1 text-left">
          <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
            {skill.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/70 dark:bg-cyan-400/80 shrink-0" />
            <span className="text-[11px] font-mono text-slate-600 dark:text-zinc-400 font-medium truncate">
              {skill.category}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TechStackMarquee() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="relative w-full overflow-hidden flex flex-col gap-4 sm:gap-5 py-2 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
      {/* Row 1 - Smooth Slow Scroll Left (matches Testimonial speed ~30px/s) */}
      <div
        className="flex w-max animate-marquee-half hover:[animation-play-state:paused]"
        style={{ animationDuration: "220s" }}
      >
        {MARQUEE_1.map((skill, idx) => (
          <TechCard key={`row1-${idx}`} skill={skill} isDark={isDark} />
        ))}
      </div>

      {/* Row 2 - Smooth Slow Scroll Right (matches Testimonial speed ~30px/s) */}
      <div
        className="flex w-max animate-marquee-half hover:[animation-play-state:paused]"
        style={{ animationDuration: "220s", animationDirection: "reverse" }}
      >
        {MARQUEE_2.map((skill, idx) => (
          <TechCard key={`row2-${idx}`} skill={skill} isDark={isDark} />
        ))}
      </div>
    </div>
  );
}
