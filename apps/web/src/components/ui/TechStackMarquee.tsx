"use client";

import { motion } from "framer-motion";
import { TiltCard } from "@/components/animations/TiltCard";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

const ROW_1 = [
  { name: "AWS Cloud", img: "amazonwebservices/amazonwebservices-original-wordmark.svg" },
  { name: "Google Cloud", img: "googlecloud/googlecloud-original.svg" },
  { name: "Azure", img: "azure/azure-original.svg" },
  { name: "DigitalOcean", img: "digitalocean/digitalocean-original.svg" },
  { name: "Cloudflare", img: "cloudflare/cloudflare-original.svg" },
  { name: "Heroku", img: "heroku/heroku-original.svg" },
  { name: "Vercel", img: "vercel/vercel-original.svg" },
  { name: "Netlify", img: "netlify/netlify-original.svg" },
  { name: "Docker", img: "docker/docker-original.svg" },
  { name: "Podman", img: "podman/podman-original.svg" },
  { name: "Kubernetes", img: "kubernetes/kubernetes-plain.svg" },
  { name: "Helm", img: "helm/helm-original.svg" },
  { name: "Terraform", img: "terraform/terraform-original.svg" },
  { name: "Pulumi", img: "pulumi/pulumi-original.svg" },
  { name: "Ansible", img: "ansible/ansible-original.svg" },
  { name: "Puppet", img: "https://cdn.simpleicons.org/puppet" },
  { name: "Chef", img: "https://cdn.simpleicons.org/chef" },
  { name: "Packer", img: "packer/packer-original.svg" },
  { name: "Vagrant", img: "vagrant/vagrant-original.svg" },
  { name: "GitHub Actions", img: "github/github-original.svg" },
  { name: "GitLab CI", img: "gitlab/gitlab-original.svg" },
  { name: "Jenkins", img: "jenkins/jenkins-original.svg" },
  { name: "CircleCI", img: "circleci/circleci-plain.svg" },
  { name: "Travis CI", img: "travis/travis-plain.svg" },
  { name: "Bitbucket", img: "bitbucket/bitbucket-original.svg" },
  { name: "ArgoCD", img: "argocd/argocd-original.svg" },
  { name: "Istio", img: "https://cdn.simpleicons.org/istio" },
  { name: "Consul", img: "consul/consul-original.svg" },
  { name: "Vault", img: "vault/vault-original.svg" },
  { name: "SonarQube", img: "sonarqube/sonarqube-original.svg" }
];

const ROW_2 = [
  { name: "Linux", img: "linux/linux-original.svg" },
  { name: "Ubuntu", img: "ubuntu/ubuntu-original.svg" },
  { name: "Debian", img: "debian/debian-original.svg" },
  { name: "AlmaLinux", img: "almalinux/almalinux-original.svg" },
  { name: "Red Hat", img: "redhat/redhat-original.svg" },
  { name: "Fedora", img: "fedora/fedora-original.svg" },
  { name: "Bash", img: "bash/bash-original.svg" },
  { name: "Nginx", img: "nginx/nginx-original.svg" },
  { name: "Apache", img: "apache/apache-original.svg" },
  { name: "Traefik", img: "https://doc.traefik.io/traefik/assets/img/traefik.logo.png" },
  { name: "Caddy", img: "https://cdn.simpleicons.org/caddy" },
  { name: "Splunk", img: "https://cdn.simpleicons.org/splunk" },
  { name: "Prometheus", img: "prometheus/prometheus-original.svg" },
  { name: "Grafana", img: "grafana/grafana-original.svg" },
  { name: "Elasticsearch", img: "elasticsearch/elasticsearch-original.svg" },
  { name: "Logstash", img: "logstash/logstash-original.svg" },
  { name: "Kibana", img: "kibana/kibana-original.svg" },
  { name: "Datadog", img: "datadog/datadog-original.svg" },
  { name: "SQLite", img: "sqlite/sqlite-original.svg" },
  { name: "Sentry", img: "sentry/sentry-original.svg" },
  { name: "PostgreSQL", img: "postgresql/postgresql-original.svg" },
  { name: "MySQL", img: "mysql/mysql-original.svg" },
  { name: "Redis", img: "redis/redis-plain.svg" },
  { name: "MongoDB", img: "mongodb/mongodb-original.svg" },
  { name: "RabbitMQ", img: "rabbitmq/rabbitmq-original.svg" },
  { name: "Apache Kafka", img: "apachekafka/apachekafka-original.svg" },
  { name: "Go", img: "go/go-original.svg" },
  { name: "Python", img: "python/python-original.svg" },
  { name: "Rust", img: "rust/rust-original.svg" },
  { name: "Node.js", img: "nodejs/nodejs-original.svg" }
];

// Duplicate items to ensure seamless loop
const MARQUEE_1 = [...ROW_1, ...ROW_1];
const MARQUEE_2 = [...ROW_2, ...ROW_2];

export function TechStackMarquee() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const needsInvert = ["GitHub Actions", "Vercel", "Rust", "Apache Kafka", "Helm", "Travis CI", "Istio", "Splunk"];
  
  return (
    <div className="relative w-full overflow-hidden flex flex-col gap-6 py-4">
      {/* Left and Right Gradients for smooth fade out */}
      <div className={cn("absolute inset-y-0 left-0 w-24 z-10 pointer-events-none", isDark ? "bg-gradient-to-r from-[#011627] to-transparent" : "bg-gradient-to-r from-slate-50 to-transparent")} />
      <div className={cn("absolute inset-y-0 right-0 w-24 z-10 pointer-events-none", isDark ? "bg-gradient-to-l from-[#011627] to-transparent" : "bg-gradient-to-l from-slate-50 to-transparent")} />

      {/* Row 1 - Scrolling Left */}
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]" style={{ animationDuration: '60s' }}>
        {MARQUEE_1.map((skill, idx) => (
          <div key={`row1-${idx}`} className="w-[280px] mx-3 shrink-0">
            <TiltCard intensity={10} className={cn(
              "backdrop-blur-sm rounded-3xl p-6 transition-colors transform-gpu group cursor-pointer shadow-xl h-full flex flex-col items-center justify-center text-center border",
              isDark ? "bg-[#0b1120]/80 border-white/10 hover:bg-white/5 hover:border-cyan-500/30" : "bg-white border-black/5 hover:border-cyan-500/30 hover:shadow-2xl"
            )}>
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all group-hover:scale-110 border",
                isDark ? "bg-white/5 border-white/10 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30" : "bg-cyan-50 border-cyan-200 group-hover:bg-cyan-100 group-hover:border-cyan-300"
              )}>
                <img referrerPolicy="no-referrer" src={skill.img.startsWith('http') ? skill.img : `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${skill.img}`} width="32" height="32" className={`h-8 w-auto filter drop-shadow-md ${needsInvert.includes(skill.name) ? (isDark ? "invert" : "") : ""}`} alt={skill.name} loading="lazy" decoding="async" />
              </div>
              <h3 className={cn("text-lg font-bold transition-colors", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>{skill.name}</h3>
            </TiltCard>
          </div>
        ))}
      </div>

      {/* Row 2 - Scrolling Right */}
      <div className="flex w-max animate-marquee-reverse hover:[animation-play-state:paused]" style={{ animationDuration: '60s' }}>
        {MARQUEE_2.map((skill, idx) => (
          <div key={`row2-${idx}`} className="w-[280px] mx-3 shrink-0">
            <TiltCard intensity={10} className={cn(
              "backdrop-blur-sm rounded-3xl p-6 transition-colors transform-gpu group cursor-pointer shadow-xl h-full flex flex-col items-center justify-center text-center border",
              isDark ? "bg-[#0b1120]/80 border-white/10 hover:bg-white/5 hover:border-cyan-500/30" : "bg-white border-black/5 hover:border-cyan-500/30 hover:shadow-2xl"
            )}>
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all group-hover:scale-110 border",
                isDark ? "bg-white/5 border-white/10 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30" : "bg-cyan-50 border-cyan-200 group-hover:bg-cyan-100 group-hover:border-cyan-300"
              )}>
                <img referrerPolicy="no-referrer" src={skill.img.startsWith('http') ? skill.img : `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${skill.img}`} width="32" height="32" className={`h-8 w-auto filter drop-shadow-md ${needsInvert.includes(skill.name) ? (isDark ? "invert" : "") : ""}`} alt={skill.name} loading="lazy" decoding="async" />
              </div>
              <h3 className={cn("text-lg font-bold transition-colors", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>{skill.name}</h3>
            </TiltCard>
          </div>
        ))}
      </div>
    </div>
  );
}
