import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';

const app = express();

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ais-vessel-map-server' });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ais-vessel-map-server',
    uptimeSeconds: Math.round(process.uptime()),
  });
});


app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});


app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.log(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
