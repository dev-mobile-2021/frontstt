import { useParams } from "react-router-dom";
import { Navigate } from "react-router-dom";

export default function EtatCessionDetailPage() {
  const { id } = useParams();
  return <Navigate to={`/etats-cession/${id}/modifier`} replace />;
}
