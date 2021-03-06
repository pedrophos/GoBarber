import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt-BR';
import User from '../models/User';
import Appointment from '../models/Appointment';
import File from '../models/File';
import Notification from '../schemas/Notification';

import Mail from '../../lib/Mail';

class AppointmentController {
  async index(req,res) {
    const { page = 1} = req.query;

    const appointments = await Appointment.findAll({
      where: {user_id: req.userId, canceled_at: null},
      order:['date'] ,
      limit: 20,
      offset: (page - 1) * 20,
      attributes: ['id','date'],
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id','name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id','path','url'],
            }
          ]
        }
      ]
    });

    return res.json(appointments);

  }
  async store(req,res) {

    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required()
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({error: 'Validation Fails'});
    }

    const { provider_id, date } = req.body;

    const isProvider = await User.findOne({
      where: {
        id: provider_id, provider: true
      }
    });

    if(!isProvider) {
      return res.status(401).json({error: 'You can only create appointments with providers'})
    };

    if(provider_id == req.userId) {
      return res.status(401).json({error: 'You can not create an appointment with yourself!'})
    };

    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart,new Date()))  {
      return res.status(400).json({ error: 'Past dates are not permitted' })
    }

    const checkAvailability = await Appointment.findOne({
      where:
      {
        provider_id,
        canceled_at: null,
        date: hourStart,
      }
    });

    if (checkAvailability) {
      return res.status(400).json({ error: 'Appointment date is not available' });
    }

    const appoitment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date,
    });

    const user = await User.findByPk(req.userId);
    const formatedDate = format(
        hourStart,
        "'dia' dd 'de' MMMM', às' H:mm'h'",
        { locale: pt})

    await Notification.create({
      content: `Novo agendamento de ${user.name} para ${formatedDate}`,
      user: provider_id,
    });

    return res.json(appoitment);
  }

  async delete(req,res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name','email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        }
      ],
    });

    // console.log(appointment);

    if(appointment.user_id != req.userId) {
      return res.status(401).json({
        error: "You don't have permission to cancel this appointment.",
      })
    };

    const dateWithSub = subHours(appointment.date, 2);

    if(isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        error: 'You can only cancel appointments 2 hours in advance.',
      })
    };

    if(appointment.canceled_at) {
      return res.status(401).json({
        error: 'Appointment already canceled!'
      })
    }

    appointment.canceled_at = new Date();

    await appointment.save();

    await Mail.sendMail({
      to:  `${appointment.provider.name} <${appointment.provider.email}>`,
      subject: 'Agendamento Cancelado',
      template: 'cancellation',
      context: {
        provider: appointment.provider.name,
        user: appointment.user.name,
        date: format(
          appointment.date,
          "'dia' dd 'de' MMMM', às' H:mm'h'",
          { locale: pt})
      }
    })

    return res.json(appointment);

  }

}

export default new AppointmentController();
