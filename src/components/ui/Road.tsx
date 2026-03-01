export const Road = ({ color }: { color: string }) => (
  <span className={`inline-block w-3 h-1 ${color} rounded-sm rotate-[-30deg] mr-1.5 shadow-sm`} 
        style={{ verticalAlign: 'middle' }} 
  />
);