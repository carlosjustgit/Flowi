import Link from 'next/link';

interface Project {
  id: string;
  client_name: string;
  language: 'pt' | 'en';
  created_at: string;
}

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const langLabel = project.language === 'pt' ? 'PT' : 'EN';
  const langTitle = project.language === 'pt' ? 'European Portuguese' : 'English';

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-xl font-semibold text-gray-900">
            {project.client_name}
          </h3>
          <span
            title={langTitle}
            className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700"
          >
            {langLabel}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          Created {new Date(project.created_at).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}
