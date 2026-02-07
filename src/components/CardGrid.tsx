import { ReactNode } from "react";

interface CardGridProps {
  children: ReactNode;
}

export function CardGrid({ children }: CardGridProps) {
  return (
    <>
      <style jsx>{`
        .card-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        @media (max-width: 1200px) {
          .card-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }

        @media (max-width: 900px) {
          .card-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (max-width: 600px) {
          .card-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div className="card-grid">{children}</div>
    </>
  );
}