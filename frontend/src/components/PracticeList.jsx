import PropTypes from "prop-types";
import { studentName, practiceName } from "../utils/workflow.js";
import { arlStatus, formatDate, hoursProgress } from "../utils/dashboard.js";
import { Facts, RecordList } from "./WorkArea.jsx";

export default function PracticeList({ practices = [], personal = false, showHours = false }) {
  return (
    <RecordList
      empty="Aún no hay prácticas asignadas."
      expandSingle={personal}

      filterLabel={personal ? "Buscar por institución o semestre" : "Buscar por estudiante o institución"}
      records={practices.map((practice) => {
        const hours = hoursProgress([practice]);
        const insurance = practice.modalidad === "Presencial" ? arlStatus(practice.fecha_vencimiento_arl) : practice.estado_arl;
        const alert = !personal && !showHours && ["Vencida", "Por vencer"].includes(insurance);
        return {
          id: practice.id_practica,
          title: personal ? practiceName(practice) : studentName(practice),
          subtitle: personal ? practice.tipo_practica : practiceName(practice),
          status: alert ? `ARL ${insurance.toLowerCase()}` : practice.estado_practica,
          search: [practice.modalidad, insurance].filter(Boolean).join(" "),
          content: (
            <>
              <div className="hours-line">
                <span><strong>{hours.done}</strong> de {hours.required} horas registradas</span>
                <progress value={hours.percent} max={100} aria-label="Progreso de horas" />
              </div>
              <Facts items={showHours ? [
                ["Horas restantes", Math.max(0, Math.round((hours.required - hours.done) * 100) / 100)],
                ["Estado de horas", practice.estado_horas],
                ["Seguimiento", practice.estado_seg],
              ] : [
                ["Tutor", practice.tutor?.usuario?.nombre_completo],
                ["Asesor", practice.asesor?.usuario?.nombre_completo],
                ["Modalidad", practice.modalidad],
                ["Inicio", formatDate(practice.fecha_inicio)],
                ["Fin", formatDate(practice.fecha_fin)],
                ["Estado ARL", insurance],
                ["Vencimiento ARL", practice.fecha_vencimiento_arl && formatDate(practice.fecha_vencimiento_arl)],
                ["Seguimiento", practice.estado_seg],
              ]} />
            </>
          ),
        };
      })}
    />
  );
}

PracticeList.propTypes = { practices: PropTypes.array, personal: PropTypes.bool, showHours: PropTypes.bool };
