import { API } from "./config";

// Saare project calls yahin se hote hain. Abhi server ki disk (projects/ folder) pe save hota hai.
// Deploy ke waqt storage badalna ho to sirf is file ko badalna padega.
export type ProjectMode = "fact" | "edit" | "flex";
export type ProjectMeta = { id: string; name: string; mode: ProjectMode; updatedAt: number };
export type ProjectFull = ProjectMeta & { data: any; mediaIds: string[] };

const json = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      msg = ((await res.json()) as { error?: string }).error || msg;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as T;
};

export const projectApi = {
  list: async (): Promise<ProjectMeta[]> => json(await fetch(`${API}/api/projects`)),

  create: async (mode: ProjectMode, name: string): Promise<ProjectMeta> =>
    json(
      await fetch(`${API}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, name }),
      }),
    ),

  load: async (id: string): Promise<ProjectFull> => json(await fetch(`${API}/api/projects/${id}`)),

  save: async (id: string, body: { data?: unknown; mediaIds?: string[]; name?: string }): Promise<ProjectMeta> =>
    json(
      await fetch(`${API}/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),

  uploadMedia: async (id: string, mediaId: string, file: File): Promise<void> => {
    await json(
      await fetch(`${API}/api/projects/${id}/media/${mediaId}`, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name),
        },
        body: file,
      }),
    );
  },

  fetchMedia: async (id: string, mediaId: string): Promise<File> => {
    const res = await fetch(`${API}/api/projects/${id}/media/${mediaId}`);
    if (!res.ok) throw new Error(`media ${mediaId}: HTTP ${res.status}`);
    const blob = await res.blob();
    let name = "file";
    try {
      name = decodeURIComponent(res.headers.get("X-File-Name") || "file");
    } catch {}
    return new File([blob], name, { type: blob.type });
  },

  remove: async (id: string): Promise<void> => {
    await json(await fetch(`${API}/api/projects/${id}`, { method: "DELETE" }));
  },
};
