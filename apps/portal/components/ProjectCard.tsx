import Link from 'next/link';

interface Project {
  id: string;
  client_name: string;
  created_at: string;
}

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {project.client_name}
        </h3>
        <p className="text-sm text-gray-600">
          Created {new Date(project.created_at).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}
