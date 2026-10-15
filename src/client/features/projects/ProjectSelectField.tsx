import { Select } from "@client/components/ui/Select";
import { useProjectList } from "./useProjects";

interface ProjectSelectFieldProps {
  projectId: string | null;
  onChange: (projectId: string | null) => void;
}

/** Selector de proyecto reutilizado por el detalle de tarea y el editor de notas. */
export function ProjectSelectField({ projectId, onChange }: ProjectSelectFieldProps) {
  const { data: allProjects } = useProjectList();
  const options = [
    { value: "none", label: "Sin proyecto" },
    ...(allProjects ?? []).map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <Select
      aria-label="Proyecto"
      value={projectId ?? "none"}
      onValueChange={(value) => onChange(value === "none" ? null : value)}
      options={options}
    />
  );
}
